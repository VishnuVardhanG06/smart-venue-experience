/* ================================================================
   SMART VENUE EXPERIENCE — Main Express + WebSocket Server
   PORT 3000  |  ws://localhost:3000
   ================================================================ */

const express    = require('express');
const http       = require('http');
const WebSocket  = require('ws');
const cors       = require('cors');
const path       = require('path');

const store      = require('./store');
const wf         = require('./workflows');
const iot        = require('./simulation');
const { router: apiRouter, init: initRoutes } = require('./routes');

const PORT = process.env.PORT || 3000;

/* ── Express setup ─────────────────────────────────────────── */
const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

/* Serve the entire Smart Venue Experience folder as static files */
app.use(express.static(path.join(__dirname, '..')));

/* API routes under /api */
app.use('/api', apiRouter);

/* Fallback: serve index.html for any unmatched GET */
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

/* ── HTTP + WebSocket server ────────────────────────────────── */
const server = http.createServer(app);
const wss    = new WebSocket.Server({ server, path: '/ws' });

/* Connected clients set */
const clients = new Set();

wss.on('connection', (ws, req) => {
  clients.add(ws);
  console.log(`[WS] Client connected (${clients.size} total) from ${req.socket.remoteAddress}`);

  /* Send full snapshot immediately on connect */
  safeSend(ws, {
    event: 'snapshot',
    data: {
      zones:         store.zones,
      gates:         store.gates,
      queues:        store.queues,
      staff:         store.staff,
      incidents:     store.incidents,
      attendees:     store.attendees,
      orders:        store.orders,
      notifications: store.notifications,
      messages:      store.messages,
      menuItems:     store.menuItems,
      lostFound:     store.lostFound,
      kpis:          store.getKPIs(),
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    console.log(`[WS] Client disconnected (${clients.size} remaining)`);
  });

  ws.on('error', err => {
    console.error('[WS] Client error:', err.message);
    clients.delete(ws);
  });

  /* Handle messages from client (e.g. ping) */
  ws.on('message', raw => {
    try {
      const msg = JSON.parse(raw);
      if (msg.type === 'ping') safeSend(ws, { event: 'pong', ts: new Date() });
    } catch (_) {}
  });
});

/* ── Broadcast to all connected clients ─────────────────────── */
function broadcast(payload) {
  const json = JSON.stringify(payload);
  clients.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) ws.send(json);
  });
}

function safeSend(ws, payload) {
  try {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(payload));
  } catch (e) {
    console.error('[WS] safeSend error:', e.message);
  }
}

/* ── Wire broadcast into modules ────────────────────────────── */
wf.init(broadcast);
iot.init(broadcast);
initRoutes(broadcast);

/* ── Start background engines ───────────────────────────────── */
wf.start();
iot.start();

/* ── Start server ───────────────────────────────────────────── */
server.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║   🏟️  Smart Venue Experience — Backend Server         ║');
  console.log('╠══════════════════════════════════════════════════════╣');
  console.log(`║   HTTP  →  http://localhost:${PORT}                     ║`);
  console.log(`║   WS    →  ws://localhost:${PORT}/ws                    ║`);
  console.log(`║   API   →  http://localhost:${PORT}/api/health           ║`);
  console.log('╠══════════════════════════════════════════════════════╣');
  console.log('║   Portals:                                           ║');
  console.log(`║   Attendee  →  http://localhost:${PORT}/attendee/         ║`);
  console.log(`║   Staff     →  http://localhost:${PORT}/staff/            ║`);
  console.log(`║   Command   →  http://localhost:${PORT}/command/          ║`);
  console.log('╠══════════════════════════════════════════════════════╣');
  console.log('║   IoT tick   : every 6s                              ║');
  console.log('║   WF1–WF5   : all active                             ║');
  console.log('║   Tables     : 7 seeded                              ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log('');
});

/* ── Graceful shutdown ──────────────────────────────────────── */
process.on('SIGTERM', () => { server.close(() => { console.log('[Server] Shut down gracefully'); }); });
process.on('SIGINT',  () => { server.close(() => { console.log('[Server] Shut down gracefully'); process.exit(0); }); });
