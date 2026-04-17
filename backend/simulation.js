/* ================================================================
   SMART VENUE EXPERIENCE — IoT Sensor Simulation Engine
   Mimics BLE beacon and crowd-density camera data feeds
   ================================================================ */

const store = require('./store');
const wf    = require('./workflows');

let broadcast;

function init(broadcastFn) {
  broadcast = broadcastFn;
}

/* ── Main tick (every 6 seconds) ──────────────────────────── */
function tick() {
  const changedZones   = [];
  const changedGates   = [];
  const changedQueues  = [];

  /* ─ Update zones ─ */
  store.zones.forEach(zone => {
    const prevStatus = zone.status;
    zone.current_occupancy = store.randomDelta(zone.current_occupancy, -80, 120, 0, zone.capacity);
    zone.status            = store.computeZoneStatus(zone);
    zone.last_updated      = new Date();
    changedZones.push(zone);

    // Trigger WF1 on status change to alert/critical
    if (prevStatus !== zone.status && (zone.status === 'alert' || zone.status === 'critical')) {
      wf.wf1CrowdSurge(zone);
    }
  });

  /* ─ Update gates ─ */
  store.gates.forEach(gate => {
    gate.queue_length      = store.randomDelta(gate.queue_length, -12, 18, 0, 250);
    gate.avg_wait_minutes  = store.computeGateWait(gate.queue_length);
    changedGates.push(gate);
  });

  // Trigger WF5 if any gate is heavily overloaded
  if (store.gates.some(g => g.queue_length > 120)) {
    wf.wf5GateBalancing();
  }

  /* ─ Update queues ─ */
  store.queues.forEach(queue => {
    const prevWait = queue.estimated_wait_min;
    queue.current_length      = store.randomDelta(queue.current_length, -3, 5, 0, 60);
    queue.estimated_wait_min  = Math.max(0, Math.round(queue.current_length * 0.4));
    queue.last_updated        = new Date();
    changedQueues.push(queue);

    // Trigger WF2 when wait drops below 5 min
    if (prevWait >= 5 && queue.estimated_wait_min < 5) {
      wf.wf2QueueAlert(queue);
    }
  });

  // Broadcast tick payload to all connected WebSocket clients
  broadcast({
    event: 'tick',
    data: {
      zones:  changedZones,
      gates:  changedGates,
      queues: changedQueues,
      kpis:   store.getKPIs(),
      ts:     new Date(),
    }
  });
}

/* ── Order auto-progression (every 20 seconds) ─────────────── */
function progressOrders() {
  const progression = { placed: 'preparing', preparing: 'ready', ready: 'delivered' };
  store.orders.forEach(order => {
    if (!progression[order.status]) return;
    if (Math.random() > 0.65) {
      order.status = progression[order.status];
      broadcast({ event: 'order:update', data: order });
      if (order.status === 'ready') wf.wf4OrderRouting(order);
      console.log(`[IoT] Order ${order.order_id} progressed → ${order.status}`);
    }
  });
}

/* ── Webhook handler (POST /api/webhook/iot) ───────────────── */
function handleWebhook(payload) {
  // Payload format: { zone_id, current_occupancy } or { gate_id, queue_length }
  if (payload.zone_id && payload.current_occupancy !== undefined) {
    const zone = store.zones.find(z => z.zone_id === payload.zone_id);
    if (zone) {
      const prevStatus = zone.status;
      zone.current_occupancy = payload.current_occupancy;
      zone.status = store.computeZoneStatus(zone);
      zone.last_updated = new Date();
      if (prevStatus !== zone.status) wf.wf1CrowdSurge(zone);
      broadcast({ event: 'tick', data: { zones: store.zones, gates: store.gates, queues: store.queues, kpis: store.getKPIs(), ts: new Date() } });
      return { updated: 'zone', zone_id: payload.zone_id };
    }
  }
  if (payload.gate_id && payload.queue_length !== undefined) {
    const gate = store.gates.find(g => g.gate_id === payload.gate_id);
    if (gate) {
      gate.queue_length = payload.queue_length;
      gate.avg_wait_minutes = store.computeGateWait(gate.queue_length);
      broadcast({ event: 'tick', data: { zones: store.zones, gates: store.gates, queues: store.queues, kpis: store.getKPIs(), ts: new Date() } });
      return { updated: 'gate', gate_id: payload.gate_id };
    }
  }
  return { updated: false, message: 'Unknown payload format' };
}

/* ── Start simulation loops ────────────────────────────────── */
function start() {
  setInterval(tick, 6000);            // IoT sensor tick every 6s
  setInterval(progressOrders, 20000); // Order progression every 20s
  console.log('[IoT Simulation] Started — tick every 6s, order progression every 20s');
}

module.exports = { init, start, tick, handleWebhook };
