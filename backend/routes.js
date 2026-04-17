/* ================================================================
   SMART VENUE EXPERIENCE — REST API Routes
   All 7 tables + notifications, messages, webhook, KPIs
   ================================================================ */

const express  = require('express');
const router   = express.Router();
const store    = require('./store');
const wf       = require('./workflows');
const iot      = require('./simulation');

let broadcast;
function init(broadcastFn) { broadcast = broadcastFn; }

/* ── Health ────────────────────────────────────────────────── */
router.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime().toFixed(1), ts: new Date() });
});

/* ── KPIs ──────────────────────────────────────────────────── */
router.get('/kpis', (req, res) => res.json(store.getKPIs()));

/* ══════════════════════════════════════════════════════════════
   ZONES
══════════════════════════════════════════════════════════════ */
router.get('/zones', (req, res) => res.json(store.zones));

router.get('/zones/:id', (req, res) => {
  const z = store.zones.find(z => z.zone_id === req.params.id);
  z ? res.json(z) : res.status(404).json({ error: 'Zone not found' });
});

router.patch('/zones/:id', (req, res) => {
  const z = store.zones.find(z => z.zone_id === req.params.id);
  if (!z) {return res.status(404).json({ error: 'Zone not found' });}
  Object.assign(z, req.body, { last_updated: new Date() });
  z.status = store.computeZoneStatus(z);
  broadcast({ event: 'tick', data: { zones: store.zones, gates: store.gates, queues: store.queues, kpis: store.getKPIs(), ts: new Date() } });
  res.json(z);
});

/* ══════════════════════════════════════════════════════════════
   GATES
══════════════════════════════════════════════════════════════ */
router.get('/gates', (req, res) => {
  const { zone_id } = req.query;
  res.json(zone_id ? store.gates.filter(g => g.zone_id === zone_id) : store.gates);
});

router.get('/gates/:id', (req, res) => {
  const g = store.gates.find(g => g.gate_id === req.params.id);
  g ? res.json(g) : res.status(404).json({ error: 'Gate not found' });
});

router.patch('/gates/:id', (req, res) => {
  const g = store.gates.find(g => g.gate_id === req.params.id);
  if (!g) {return res.status(404).json({ error: 'Gate not found' });}
  Object.assign(g, req.body);
  if (req.body.queue_length !== undefined) {g.avg_wait_minutes = store.computeGateWait(g.queue_length);}
  broadcast({ event: 'tick', data: { zones: store.zones, gates: store.gates, queues: store.queues, kpis: store.getKPIs(), ts: new Date() } });
  res.json(g);
});

/* ══════════════════════════════════════════════════════════════
   QUEUES
══════════════════════════════════════════════════════════════ */
router.get('/queues', (req, res) => {
  const { zone_id, facility_type } = req.query;
  let result = store.queues;
  if (zone_id)       {result = result.filter(q => q.zone_id === zone_id);}
  if (facility_type) {result = result.filter(q => q.facility_type === facility_type);}
  res.json(result);
});

router.get('/queues/:id', (req, res) => {
  const q = store.queues.find(q => q.queue_id === req.params.id);
  q ? res.json(q) : res.status(404).json({ error: 'Queue not found' });
});

router.patch('/queues/:id', (req, res) => {
  const q = store.queues.find(q => q.queue_id === req.params.id);
  if (!q) {return res.status(404).json({ error: 'Queue not found' });}
  Object.assign(q, req.body, { last_updated: new Date() });
  if (req.body.current_length !== undefined) {
    q.estimated_wait_min = Math.max(0, Math.round(q.current_length * 0.4));
    if (q.estimated_wait_min < 5) {wf.wf2QueueAlert(q);}
  }
  broadcast({ event: 'tick', data: { zones: store.zones, gates: store.gates, queues: store.queues, kpis: store.getKPIs(), ts: new Date() } });
  res.json(q);
});

/* ══════════════════════════════════════════════════════════════
   STAFF
══════════════════════════════════════════════════════════════ */
router.get('/staff', (req, res) => {
  const { zone_id, availability_status } = req.query;
  let result = store.staff;
  if (zone_id)             {result = result.filter(s => s.assigned_zone === zone_id);}
  if (availability_status) {result = result.filter(s => s.availability_status === availability_status);}
  res.json(result);
});

router.get('/staff/:id', (req, res) => {
  const s = store.staff.find(s => s.staff_id === req.params.id);
  s ? res.json(s) : res.status(404).json({ error: 'Staff not found' });
});

router.patch('/staff/:id', (req, res) => {
  const s = store.staff.find(s => s.staff_id === req.params.id);
  if (!s) {return res.status(404).json({ error: 'Staff not found' });}
  Object.assign(s, req.body);
  res.json(s);
});

/* ══════════════════════════════════════════════════════════════
   INCIDENTS
══════════════════════════════════════════════════════════════ */
router.get('/incidents', (req, res) => {
  const { status, zone_id } = req.query;
  let result = store.incidents;
  if (status)  {result = result.filter(i => i.status === status);}
  if (zone_id) {result = result.filter(i => i.zone_id === zone_id);}
  res.json(result);
});

router.get('/incidents/:id', (req, res) => {
  const i = store.incidents.find(i => i.incident_id === req.params.id);
  i ? res.json(i) : res.status(404).json({ error: 'Incident not found' });
});

router.post('/incidents', (req, res) => {
  const { type, zone_id, reported_by } = req.body;
  if (!type || !zone_id) {return res.status(400).json({ error: 'type and zone_id required' });}
  const inc = wf.createIncident(type, zone_id, reported_by || 'unknown');
  broadcast({ event: 'incident:new', data: inc });
  wf.wf3IncidentEscalation(inc);
  res.status(201).json(inc);
});

router.patch('/incidents/:id', (req, res) => {
  const inc = store.incidents.find(i => i.incident_id === req.params.id);
  if (!inc) {return res.status(404).json({ error: 'Incident not found' });}

  const prevStatus = inc.status;
  Object.assign(inc, req.body);

  // Free staff when resolved
  if (req.body.status === 'resolved' && prevStatus !== 'resolved' && inc.assigned_staff_id) {
    const s = store.staff.find(s => s.staff_id === inc.assigned_staff_id);
    if (s) {s.availability_status = 'available';}
  }

  broadcast({ event: 'incident:update', data: inc });
  res.json(inc);
});

/* ══════════════════════════════════════════════════════════════
   ATTENDEES
══════════════════════════════════════════════════════════════ */
router.get('/attendees', (req, res) => res.json(store.attendees));

router.get('/attendees/:id', (req, res) => {
  const a = store.attendees.find(a => a.attendee_id === req.params.id);
  a ? res.json(a) : res.status(404).json({ error: 'Attendee not found' });
});

router.patch('/attendees/:id', (req, res) => {
  const a = store.attendees.find(a => a.attendee_id === req.params.id);
  if (!a) {return res.status(404).json({ error: 'Attendee not found' });}
  Object.assign(a, req.body);
  res.json(a);
});

/* ══════════════════════════════════════════════════════════════
   ORDERS
══════════════════════════════════════════════════════════════ */
router.get('/orders', (req, res) => {
  const { attendee_id, status } = req.query;
  let result = store.orders;
  if (attendee_id) {result = result.filter(o => o.attendee_id === attendee_id);}
  if (status)      {result = result.filter(o => o.status === status);}
  res.json(result);
});

router.get('/orders/:id', (req, res) => {
  const o = store.orders.find(o => o.order_id === req.params.id);
  o ? res.json(o) : res.status(404).json({ error: 'Order not found' });
});

router.post('/orders', (req, res) => {
  const { attendee_id, items, delivery_zone } = req.body;
  if (!attendee_id || !items?.length) {return res.status(400).json({ error: 'attendee_id and items required' });}
  const total = items.reduce((s, i) => s + (i.price * i.qty), 0);
  const ord = {
    order_id: `ORD${String(store.orders.length + 1).padStart(3, '0')}`,
    attendee_id, items, status: 'placed',
    delivery_zone: delivery_zone || 'Z01',
    timestamp: new Date(), total,
  };
  store.orders.unshift(ord);
  const att = store.attendees.find(a => a.attendee_id === attendee_id);
  if (att) {att.order_id = ord.order_id;}
  broadcast({ event: 'order:update', data: ord });
  res.status(201).json(ord);
});

router.patch('/orders/:id', (req, res) => {
  const ord = store.orders.find(o => o.order_id === req.params.id);
  if (!ord) {return res.status(404).json({ error: 'Order not found' });}
  Object.assign(ord, req.body);
  broadcast({ event: 'order:update', data: ord });
  if (ord.status === 'ready') {wf.wf4OrderRouting(ord);}
  res.json(ord);
});

/* ══════════════════════════════════════════════════════════════
   NOTIFICATIONS
══════════════════════════════════════════════════════════════ */
router.get('/notifications', (req, res) => res.json(store.notifications));

router.post('/notifications', (req, res) => {
  const { type, title, body } = req.body;
  if (!title) {return res.status(400).json({ error: 'title required' });}
  const notif = wf.pushNotification(type || 'info', title, body || '');
  broadcast({ event: 'notification:new', data: notif });
  res.status(201).json(notif);
});

router.patch('/notifications/read-all', (req, res) => {
  store.notifications.forEach(n => n.read = true);
  res.json({ updated: store.notifications.length });
});

/* ══════════════════════════════════════════════════════════════
   MESSAGES
══════════════════════════════════════════════════════════════ */
router.get('/messages', (req, res) => {
  const { zone_id } = req.query;
  const result = zone_id
    ? store.messages.filter(m => m.to_zone === zone_id || m.to_zone === 'ALL')
    : store.messages;
  res.json(result.slice(0, 50));
});

router.post('/messages', (req, res) => {
  const { from_staff, to_zone, body } = req.body;
  if (!from_staff || !body) {return res.status(400).json({ error: 'from_staff and body required' });}
  const member = store.staff.find(s => s.staff_id === from_staff);
  const msg = {
    msg_id: `M${String(store.messages.length + 1).padStart(2, '0')}`,
    from_staff, from_name: member?.name || 'Unknown',
    to_zone: to_zone || 'ALL', body, time: new Date(),
  };
  store.messages.unshift(msg);
  broadcast({ event: 'message:new', data: msg });
  res.status(201).json(msg);
});

/* ══════════════════════════════════════════════════════════════
   MENU & LOST+FOUND (read-heavy)
══════════════════════════════════════════════════════════════ */
router.get('/menu', (req, res) => {
  const { category } = req.query;
  res.json(category ? store.menuItems.filter(m => m.category === category) : store.menuItems);
});

router.get('/lost-found', (req, res) => res.json(store.lostFound));

router.post('/lost-found', (req, res) => {
  const entry = { lf_id: `LF${Date.now()}`, ...req.body, time: new Date() };
  store.lostFound.unshift(entry);
  res.status(201).json(entry);
});

/* ══════════════════════════════════════════════════════════════
   IoT WEBHOOK  (POST /api/webhook/iot)
══════════════════════════════════════════════════════════════ */
router.post('/webhook/iot', (req, res) => {
  const result = iot.handleWebhook(req.body);
  res.json(result);
});

/* ══════════════════════════════════════════════════════════════
   AI INCIDENT ANALYSIS (Gemini Integration)
══════════════════════════════════════════════════════════════ */
const { GoogleGenAI } = require('@google/genai');

router.get('/ai/incident-analysis', async (req, res) => {
  try {
    // If no API key is provided, we catch it and return a descriptive error
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'paste_your_api_key_here') {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not set or invalid in the .env file.' });
    }
    
    // Explicitly pass apiKey so it uses the Gemini Developer API instead of trying to default to Vertex GCP Project
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }); 
    const openIncidents = store.incidents.filter(i => i.status !== 'resolved');
    
    if (openIncidents.length === 0) {
      return res.json({ summary: "✅ No active incidents. The venue is operating optimally. Staff distributions are holding steady." });
    }

    const context = openIncidents.map(i => `- [${i.incident_id}] ${i.type.toUpperCase()} in ${i.zone_id} (Status: ${i.status}, Escalated: ${i.escalated})`).join('\n');
    const prompt = `You are an AI Incident Commander for a Smart Venue Dashboard.
Here is the raw list of currently open incidents:
${context}

Write a short, professional, 2-sentence situational summary of the overall venue state, and follow it with a 1-sentence prioritized tactical recommendation for the supervisor viewing this dashboard. Do not use markdown bolding in your response.`;

    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: prompt,
    });
    
    res.json({ summary: response.text });
  } catch (error) {
    console.error("[Gemini API Error]", error.message);
    res.status(500).json({ error: 'AI Analysis failed: ' + error.message });
  }
});

module.exports = { router, init };
