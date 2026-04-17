/* ================================================================
   SMART VENUE EXPERIENCE — Workflow Automation Engine
   Implements all 5 Antigravity workflows
   ================================================================ */

const WorkflowEngine = (() => {

  /* ── Workflow 1: Crowd Surge Alert ─────────────────────────── */
  function triggerId1(zone) {
    const pct = VenueDB.occupancyPct(zone);
    if (pct < 85) {return;}

    const isCritical = zone.status === 'critical';
    const level = isCritical ? 'CRITICAL' : 'ALERT';
    const emoji = isCritical ? '🚨' : '⚠️';

    /* Find alternate gate */
    const allGates = VenueDB.gates;
    const zoneGates = VenueDB.getZoneGates(zone.zone_id);
    const overloaded = zoneGates.filter(g=>g.queue_length>80).map(g=>g.gate_id);
    const bestGate = allGates
      .filter(g=>g.is_open && g.gate_type==='entry' && !overloaded.includes(g.gate_id))
      .sort((a,b)=>a.queue_length-b.queue_length)[0];

    /* Push notification to attendees */
    const msg = bestGate
      ? `${zone.zone_name} is at ${pct}% capacity. Try Gate ${bestGate.gate_id} (${bestGate.avg_wait_minutes} min wait)`
      : `${zone.zone_name} is at ${pct}% capacity. Please use alternate routes.`;

    VenueDB.addNotification('warning', `${emoji} Crowd ${level} — ${zone.zone_name}`, msg);

    /* Alert zone staff */
    const zoneStaff = VenueDB.getZoneStaff(zone.zone_id);
    zoneStaff.forEach(s => {
      console.log(`[WF1] Staff alert → ${s.name} (${s.role}): Crowd ${level} in ${zone.zone_name}`);
    });

    showWorkflowToast(`WF1 Fired — Crowd ${level}`, msg, isCritical ? 'danger' : 'warning');
    console.log(`[WF1] Crowd surge workflow executed for ${zone.zone_name} (${pct}%)`);
  }

  /* ── Workflow 2: Queue Threshold Notification ──────────────── */
  function triggerId2(queue) {
    if (queue.estimated_wait_min >= 5) {return;}

    const facilityEmojis = { food:'🍔', restroom:'🚻', merch:'👕' };
    const emoji = facilityEmojis[queue.facility_type] || '📍';

    /* Notify opt-in attendees in the same zone */
    const zoneAttendees = VenueDB.attendees.filter(
      a => a.current_zone === queue.zone_id && a.notification_opt_in
    );

    const body = `${queue.location_name} is nearly empty! Only ~${queue.estimated_wait_min} min wait.`;
    VenueDB.addNotification('info', `${emoji} Short Wait Nearby`, body);

    showWorkflowToast('WF2 Fired — Queue Alert', body, 'info');
    console.log(`[WF2] Queue notification sent to ${zoneAttendees.length} attendees in ${queue.zone_id}`);
  }

  /* ── Workflow 3: Incident Escalation ───────────────────────── */
  function triggerId3(incident) {
    if (incident.assigned_staff_id) {return;}

    /* Auto-assign nearest available staff */
    setTimeout(() => {
      const openInc = VenueDB.incidents.find(i=>i.incident_id===incident.incident_id);
      if (!openInc || openInc.status !== 'open' || openInc.assigned_staff_id) {return;}

      const available = VenueDB.staff
        .filter(s => s.availability_status === 'available' && s.assigned_zone === openInc.zone_id);
      const fallback = VenueDB.staff.filter(s => s.availability_status === 'available');
      const assignee = (available.length ? available : fallback)[0];

      if (assignee) {
        openInc.assigned_staff_id = assignee.staff_id;
        openInc.status = 'in-progress';
        assignee.availability_status = 'busy';
        VenueDB.emit('incident:assigned', { incident: openInc, staff: assignee });
        showWorkflowToast('WF3 — Auto-Assigned', `${assignee.name} dispatched to ${openInc.type} in ${openInc.zone_id}`, 'warning');
        console.log(`[WF3] Auto-assigned ${assignee.name} to ${openInc.incident_id}`);

        /* Escalate to supervisor if unacknowledged for 5 min */
        setTimeout(() => {
          const inc = VenueDB.incidents.find(i=>i.incident_id===openInc.incident_id);
          if (!inc || inc.status === 'resolved' || inc.escalated) {return;}
          inc.escalated = true;
          const supervisor = VenueDB.staff.find(s=>s.role==='Zone Supervisor'&&s.assigned_zone===inc.zone_id);
          const msg = supervisor
            ? `Incident ${inc.incident_id} escalated to ${supervisor.name} (Supervisor)`
            : `Incident ${inc.incident_id} escalated to operations team`;
          VenueDB.addNotification('danger', '🚨 Escalation Required', msg);
          showWorkflowToast('WF3 — Escalated', msg, 'danger');
          console.log(`[WF3] Escalation triggered for ${inc.incident_id}`);
        }, 8000); // 8s demo (real: 5min)
      }
    }, 3000); // 3s demo (real: 3min)
  }

  /* ── Workflow 4: Order Delivery Routing ────────────────────── */
  function triggerId4(order) {
    const attendee = VenueDB.attendees.find(a=>a.attendee_id===order.attendee_id);
    if (!attendee) {return;}

    /* Find nearest available delivery staff */
    const runners = VenueDB.staff.filter(
      s => s.role === 'Delivery Runner'
        && s.availability_status === 'available'
        && s.assigned_zone === order.delivery_zone
    );
    const runner = runners[0] || VenueDB.staff.find(s=>s.role==='Delivery Runner'&&s.availability_status==='available');

    const msg = `Your order is on its way to seat ${attendee.seat_number}!`;
    VenueDB.addNotification('success', '🛵 Order Dispatched', msg);

    if (runner) {
      runner.availability_status = 'busy';
      console.log(`[WF4] ${runner.name} dispatched with order ${order.order_id} → ${attendee.seat_number}`);
      setTimeout(() => { runner.availability_status = 'available'; }, 10000);
    }

    showWorkflowToast('WF4 — Order Ready', msg, 'success');
    console.log(`[WF4] Order delivery workflow triggered for ${order.order_id}`);
  }

  /* ── Workflow 5: Gate Load Balancing ───────────────────────── */
  function triggerId5() {
    const zones = VenueDB.zones;
    zones.forEach(zone => {
      const zoneGates = VenueDB.getZoneGates(zone.zone_id).filter(g=>g.is_open&&g.gate_type==='entry');
      if (zoneGates.length < 2) {return;}

      const avgQueue = zoneGates.reduce((s,g)=>s+g.queue_length,0) / zoneGates.length;
      const overloaded = zoneGates.filter(g=>g.queue_length > avgQueue*1.4);
      const underloaded = zoneGates.filter(g=>g.queue_length < avgQueue*0.6).sort((a,b)=>a.queue_length-b.queue_length);

      overloaded.forEach(og => {
        const alt = underloaded[0];
        if (!alt) {return;}
        const msg = `Gate ${og.gate_id} is busy (${og.queue_length} in queue). Switch to Gate ${alt.gate_id} — only ${alt.queue_length} in line!`;
        VenueDB.addNotification('info', '🚦 Faster Entry Available', msg);
        showWorkflowToast('WF5 — Gate Reroute', `${zone.zone_name}: ${og.gate_id} → ${alt.gate_id}`, 'info');
        console.log(`[WF5] Gate balancing: ${og.gate_id} → ${alt.gate_id} in ${zone.zone_name}`);
      });
    });
  }

  /* ── Escalation checker (periodic) ────────────────────────── */
  function checkEscalations() {
    const now = new Date();
    VenueDB.incidents.forEach(inc => {
      if (inc.status === 'resolved' || inc.escalated) {return;}
      const age = (now - inc.timestamp) / 60000; // minutes
      if (age > 8 && !inc.escalated) {
        inc.escalated = true;
        const supervisor = VenueDB.staff.find(s=>s.role==='Zone Supervisor'&&s.assigned_zone===inc.zone_id);
        if (supervisor) {
          VenueDB.addNotification('danger','🚨 Incident Overdue',`Incident ${inc.incident_id} unresolved for ${Math.floor(age)} min. Escalated to ${supervisor.name}`);
        }
      }
    });
  }

  /* ── Gate load balancing scheduler ────────────────────────── */
  let balanceTimer;
  function startGateBalancing() {
    balanceTimer = setInterval(triggerId5, 120000); // every 2 min
    // Also fire if any gate is heavily loaded
    VenueDB.on('tick', () => {
      const heavy = VenueDB.gates.find(g=>g.queue_length>120);
      if (heavy) {triggerId5();}
    });
  }

  /* ── Toast helper ──────────────────────────────────────────── */
  function showWorkflowToast(title, body, type='info') {
    if (typeof showToast === 'function') {showToast(title, body, type);}
  }

  return {
    triggerId1,
    triggerId2,
    triggerId3,
    triggerId4,
    triggerId5,
    checkEscalations,
    startGateBalancing,
    start() {
      this.startGateBalancing();
      console.log('[WorkflowEngine] All 5 workflows active ✅');
    }
  };
})();
