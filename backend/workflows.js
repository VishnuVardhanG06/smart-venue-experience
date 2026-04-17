/* ================================================================
   SMART VENUE EXPERIENCE — Server-Side Workflow Engine (WF1–WF5)
   ================================================================ */

const store = require('./store');

let broadcast; // injected from server.js

function init(broadcastFn) {
  broadcast = broadcastFn;
  console.log('[WorkflowEngine] All 5 workflows initialised ✅');
}

/* ── WF1: Crowd Surge Alert ────────────────────────────────── */
function wf1CrowdSurge(zone) {
  const pct = Math.round((zone.current_occupancy / zone.capacity) * 100);
  if (pct < 85) return;

  const level    = zone.status === 'critical' ? 'CRITICAL' : 'ALERT';
  const emoji    = zone.status === 'critical' ? '🚨' : '⚠️';
  const overloaded = store.gates.filter(g => g.zone_id === zone.zone_id && g.queue_length > 80).map(g => g.gate_id);
  const bestGate   = store.gates
    .filter(g => g.is_open && g.gate_type === 'entry' && !overloaded.includes(g.gate_id))
    .sort((a, b) => a.queue_length - b.queue_length)[0];

  const body = bestGate
    ? `${zone.zone_name} is at ${pct}% capacity. Try Gate ${bestGate.gate_id} (${bestGate.avg_wait_minutes} min wait).`
    : `${zone.zone_name} is at ${pct}% capacity. Please use alternate routes.`;

  const notif = pushNotification('warning', `${emoji} Crowd ${level} — ${zone.zone_name}`, body);

  // Create incident only if no existing open crowd_surge for this zone
  const existing = store.incidents.find(i => i.type === 'crowd_surge' && i.zone_id === zone.zone_id && i.status !== 'resolved');
  if (!existing) {
    const inc = createIncident('crowd_surge', zone.zone_id, `Sensor-${zone.zone_id}`);
    broadcast({ event: 'incident:new', data: inc });
    wf3IncidentEscalation(inc);
  }

  broadcast({ event: 'zone:' + (zone.status === 'critical' ? 'critical' : 'alert'), data: zone });
  broadcast({ event: 'notification:new', data: notif });
  console.log(`[WF1] Crowd ${level} fired for ${zone.zone_name} (${pct}%)`);
}

/* ── WF2: Queue Threshold Notification ────────────────────── */
function wf2QueueAlert(queue) {
  if (queue.estimated_wait_min >= 5) return;
  const emojiMap = { food: '🍔', restroom: '🚻', merch: '👕' };
  const emoji = emojiMap[queue.facility_type] || '📍';
  const body = `${queue.location_name} is nearly empty — only ~${queue.estimated_wait_min} min wait!`;
  const notif = pushNotification('info', `${emoji} Short Wait Nearby`, body);
  broadcast({ event: 'notification:new', data: notif });
  console.log(`[WF2] Queue alert sent for ${queue.location_name} (${queue.estimated_wait_min} min)`);
}

/* ── WF3: Incident Escalation ──────────────────────────────── */
function wf3IncidentEscalation(incident) {
  if (incident.assigned_staff_id) return;

  // Auto-assign in 3s (demo; production: 3 min)
  setTimeout(() => {
    const inc = store.incidents.find(i => i.incident_id === incident.incident_id);
    if (!inc || inc.status !== 'open' || inc.assigned_staff_id) return;

    const zoneStaff = store.staff.filter(s => s.assigned_zone === inc.zone_id && s.availability_status === 'available');
    const anyStaff  = store.staff.filter(s => s.availability_status === 'available');
    const assignee  = (zoneStaff.length ? zoneStaff : anyStaff)[0];

    if (assignee) {
      inc.assigned_staff_id = assignee.staff_id;
      inc.status = 'in-progress';
      assignee.availability_status = 'busy';
      broadcast({ event: 'incident:update', data: inc });
      const notif = pushNotification('warning', '🔧 Incident Assigned', `${assignee.name} dispatched to ${inc.type.replace(/_/g,' ')} in ${inc.zone_id}`);
      broadcast({ event: 'notification:new', data: notif });
      console.log(`[WF3] Auto-assigned ${assignee.name} to ${inc.incident_id}`);

      // Escalate after 8s (demo; production: 5 min) if unresolved
      setTimeout(() => {
        const current = store.incidents.find(i => i.incident_id === inc.incident_id);
        if (!current || current.status === 'resolved' || current.escalated) return;
        current.escalated = true;
        const supervisor = store.staff.find(s => s.role === 'Zone Supervisor' && s.assigned_zone === current.zone_id);
        const msg = supervisor
          ? `Incident ${current.incident_id} escalated to Supervisor ${supervisor.name}`
          : `Incident ${current.incident_id} escalated to Operations team`;
        const notif2 = pushNotification('danger', '🚨 Escalation Required', msg);
        broadcast({ event: 'notification:new', data: notif2 });
        broadcast({ event: 'incident:update', data: current });
        console.log(`[WF3] Escalation triggered for ${current.incident_id}`);
      }, 8000);
    }
  }, 3000);
}

/* ── WF4: Order Delivery Routing ───────────────────────────── */
function wf4OrderRouting(order) {
  if (order.status !== 'ready') return;
  const attendee = store.attendees.find(a => a.attendee_id === order.attendee_id);
  if (!attendee) return;

  const runners = store.staff.filter(s =>
    s.role === 'Delivery Runner' &&
    s.availability_status === 'available' &&
    s.assigned_zone === order.delivery_zone
  );
  const runner = runners[0] || store.staff.find(s => s.role === 'Delivery Runner' && s.availability_status === 'available');

  const body = `Your order is on its way to seat ${attendee.seat_number}!`;
  const notif = pushNotification('success', '🛵 Order Dispatched', body);
  broadcast({ event: 'notification:new', data: notif });

  if (runner) {
    runner.availability_status = 'busy';
    console.log(`[WF4] ${runner.name} dispatched for order ${order.order_id} → ${attendee.seat_number}`);
    setTimeout(() => { runner.availability_status = 'available'; }, 60000);
  }
}

/* ── WF5: Gate Load Balancing ──────────────────────────────── */
function wf5GateBalancing() {
  store.zones.forEach(zone => {
    const zoneGates = store.gates.filter(g => g.zone_id === zone.zone_id && g.is_open && g.gate_type === 'entry');
    if (zoneGates.length < 2) return;
    const avgQ = zoneGates.reduce((s, g) => s + g.queue_length, 0) / zoneGates.length;
    const overloaded = zoneGates.filter(g => g.queue_length > avgQ * 1.4);
    const underloaded = zoneGates.filter(g => g.queue_length < avgQ * 0.6).sort((a,b) => a.queue_length - b.queue_length);

    overloaded.forEach(og => {
      const alt = underloaded[0];
      if (!alt) return;
      const msg = `Gate ${og.gate_id} busy (${og.queue_length} queued). Switch to Gate ${alt.gate_id} — only ${alt.queue_length} in line!`;
      const notif = pushNotification('info', '🚦 Faster Entry Available', msg);
      broadcast({ event: 'notification:new', data: notif });
      console.log(`[WF5] Gate reroute: ${og.gate_id} → ${alt.gate_id} in ${zone.zone_name}`);
    });
  });
}

/* ── Escalation checker ────────────────────────────────────── */
function checkEscalations() {
  const now = new Date();
  store.incidents.forEach(inc => {
    if (inc.status === 'resolved' || inc.escalated) return;
    const ageMin = (now - new Date(inc.timestamp)) / 60000;
    if (ageMin > 8) {
      inc.escalated = true;
      const supervisor = store.staff.find(s => s.role === 'Zone Supervisor' && s.assigned_zone === inc.zone_id);
      if (supervisor) {
        const notif = pushNotification('danger', '🚨 Incident Overdue', `Incident ${inc.incident_id} unresolved for ${Math.floor(ageMin)} min. Escalated to ${supervisor.name}`);
        broadcast({ event: 'notification:new', data: notif });
        broadcast({ event: 'incident:update', data: inc });
      }
    }
  });
}

/* ── Notification helper ───────────────────────────────────── */
function pushNotification(type, title, body) {
  const notif = { id: `N${Date.now()}`, type, title, body, time: new Date(), read: false };
  store.notifications.unshift(notif);
  if (store.notifications.length > 100) store.notifications.pop(); // cap at 100
  return notif;
}

/* ── Incident creator ──────────────────────────────────────── */
function createIncident(type, zone_id, reported_by) {
  const inc = {
    incident_id: `INC${String(store.incidents.length + 1).padStart(3, '0')}`,
    type, zone_id, reported_by,
    assigned_staff_id: null,
    status: 'open',
    timestamp: new Date(),
    escalated: false,
  };
  store.incidents.unshift(inc);
  return inc;
}

/* ── Start scheduled workflows ─────────────────────────────── */
function start() {
  // WF5: gate balancing every 2 minutes
  setInterval(wf5GateBalancing, 120000);
  // Escalation check every 30 seconds
  setInterval(checkEscalations, 30000);
  console.log('[WorkflowEngine] Scheduled tasks running (WF5 every 2m, escalation every 30s)');
}

module.exports = {
  init, start,
  wf1CrowdSurge,
  wf2QueueAlert,
  wf3IncidentEscalation,
  wf4OrderRouting,
  wf5GateBalancing,
  createIncident,
  pushNotification,
};
