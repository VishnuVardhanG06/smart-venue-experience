/* ================================================================
   SMART VENUE EXPERIENCE — Frontend API Client (js/api.js)
   Connects to Node.js backend via REST + WebSocket.
   Overrides VenueDB in-place so all portals work unchanged.
   Falls back silently to local simulation if server unreachable.
   ================================================================ */

(function initAPIClient() {
  /* Auto-detect: works on localhost AND any deployed domain (Railway, Render, etc.) */
  const BASE       = window.location.origin;                                       // e.g. https://my-app.railway.app
  const WS_PROTO   = window.location.protocol === 'https:' ? 'wss:' : 'ws:';      // wss on HTTPS, ws on HTTP
  const WS_URL     = `${WS_PROTO}//${window.location.host}/ws`;                   // e.g. wss://my-app.railway.app/ws
  let   ws      = null;
  let   connected = false;
  let   reconnectTimer = null;

  /* ── Attempt server connection ───────────────────────────── */
  async function connect() {
    try {
      const ctrl = new AbortController();
      const timeout = setTimeout(() => ctrl.abort(), 2500);
      const resp = await fetch(`${BASE}/api/health`, { signal: ctrl.signal });
      clearTimeout(timeout);
      if (!resp.ok) {throw new Error('Server unhealthy');}

      connected = true;
      console.log('[API] Backend reachable ✅ — switching to server-driven mode');
      openWebSocket();

    } catch (e) {
      console.warn('[API] Backend unreachable — using local simulation fallback');
      if (typeof showToast === 'function') {
        showToast('📡 Offline Mode', 'Server not detected — local simulation active', 'info');
      }
      /* Start local simulation as usual */
      if (typeof VenueDB !== 'undefined' && typeof VenueDB.startSimulation === 'function') {
        VenueDB.startSimulation();
      }
      if (typeof WorkflowEngine !== 'undefined' && typeof WorkflowEngine.start === 'function') {
        WorkflowEngine.start();
      }
    }
  }

  /* ── WebSocket ───────────────────────────────────────────── */
  function openWebSocket() {
    ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      console.log('[WS] Connected to Smart Venue backend');
      clearTimeout(reconnectTimer);
      if (typeof showToast === 'function') {
        showToast('🔗 Server Connected', 'Live data streaming from backend (Node.js)', 'success');
      }
      /* Stop local simulation — server drives everything now */
      connected = true;
    };

    /* ── Incoming server events ─────────────────────────────── */
    ws.onmessage = (ev) => {
      let msg;
      try { msg = JSON.parse(ev.data); } catch { return; }
      const { event, data } = msg;

      switch (event) {

        /* Full state snapshot on first connect */
        case 'snapshot':
          applySnapshot(data);
          break;

        /* IoT tick — update zones, gates, queues in-place */
        case 'tick':
          if (data.zones)  {mergeArray(VenueDB.zones,  data.zones,  'zone_id');}
          if (data.gates)  {mergeArray(VenueDB.gates,  data.gates,  'gate_id');}
          if (data.queues) {mergeArray(VenueDB.queues, data.queues, 'queue_id');}
          VenueDB.emit('tick', { zones: VenueDB.zones, gates: VenueDB.gates, queues: VenueDB.queues });
          break;

        /* New or updated incident */
        case 'incident:new':
          if (!VenueDB.incidents.find(i => i.incident_id === data.incident_id)) {
            VenueDB.incidents.unshift(data);
          }
          VenueDB.emit('incident:new', data);
          break;

        case 'incident:update':
          mergeArray(VenueDB.incidents, [data], 'incident_id');
          VenueDB.emit('incident:update', data);
          break;

        /* Order status changed */
        case 'order:update':
          mergeArray(VenueDB.orders, [data], 'order_id');
          VenueDB.emit('order:update', data);
          break;

        /* Push notification */
        case 'notification:new':
          if (!VenueDB.notifications.find(n => n.id === data.id)) {
            VenueDB.notifications.unshift(data);
          }
          VenueDB.emit('notification:new', data);
          break;

        /* Zone alerts */
        case 'zone:alert':
          mergeArray(VenueDB.zones, [data], 'zone_id');
          VenueDB.emit('zone:alert', data);
          break;

        case 'zone:critical':
          mergeArray(VenueDB.zones, [data], 'zone_id');
          VenueDB.emit('zone:critical', data);
          break;

        /* New staff message */
        case 'message:new':
          if (!VenueDB.messages.find(m => m.msg_id === data.msg_id)) {
            VenueDB.messages.unshift(data);
          }
          VenueDB.emit('message:new', data);
          break;

        case 'pong':
          break;

        default:
          console.log('[WS] Unknown event:', event);
      }
    };

    ws.onclose = () => {
      connected = false;
      console.warn('[WS] Disconnected — retrying in 5s');
      reconnectTimer = setTimeout(openWebSocket, 5000);
    };

    ws.onerror = (err) => {
      console.error('[WS] Error:', err.message || err);
    };

    /* Keep-alive ping every 25s */
    setInterval(() => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 25000);
  }

  /* ── Apply full snapshot from server ─────────────────────── */
  function applySnapshot(data) {
    if (data.zones)         {mergeArray(VenueDB.zones,         data.zones,         'zone_id');}
    if (data.gates)         {mergeArray(VenueDB.gates,         data.gates,         'gate_id');}
    if (data.queues)        {mergeArray(VenueDB.queues,        data.queues,        'queue_id');}
    if (data.staff)         {mergeArray(VenueDB.staff,         data.staff,         'staff_id');}
    if (data.incidents)     {mergeArray(VenueDB.incidents,     data.incidents,     'incident_id');}
    if (data.attendees)     {mergeArray(VenueDB.attendees,     data.attendees,     'attendee_id');}
    if (data.orders)        {mergeArray(VenueDB.orders,        data.orders,        'order_id');}
    if (data.notifications) {mergeArray(VenueDB.notifications, data.notifications, 'id');}
    if (data.messages)      {mergeArray(VenueDB.messages,      data.messages,      'msg_id');}
    if (data.menuItems)     {mergeArray(VenueDB.menuItems,     data.menuItems,     'item_id');}
    if (data.lostFound)     {mergeArray(VenueDB.lostFound,     data.lostFound,     'lf_id');}

    console.log('[API] Snapshot applied — all 7 tables synced from server');
    VenueDB.emit('snapshot', data);
    VenueDB.emit('tick', { zones: VenueDB.zones, gates: VenueDB.gates, queues: VenueDB.queues });
  }

  /* ── Merge array items by key (mutates in-place) ─────────── */
  function mergeArray(localArr, serverArr, key) {
    serverArr.forEach(serverItem => {
      const idx = localArr.findIndex(l => l[key] === serverItem[key]);
      if (idx === -1) {
        localArr.unshift(serverItem);
      } else {
        Object.assign(localArr[idx], serverItem);
      }
    });
  }

  /* ── Override VenueDB write methods to POST to API ──────── */
  function patchVenueDB() {

    /* addIncident → POST /api/incidents (+ fallback to local) */
    const _addIncident = VenueDB.addIncident.bind(VenueDB);
    VenueDB.addIncident = async function(type, zone_id, reported_by) {
      if (!connected) {return _addIncident(type, zone_id, reported_by);}
      try {
        const resp = await fetch(`${BASE}/api/incidents`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type, zone_id, reported_by }),
        });
        const inc = await resp.json();
        if (!VenueDB.incidents.find(i => i.incident_id === inc.incident_id)) {
          VenueDB.incidents.unshift(inc);
        }
        VenueDB.emit('incident:new', inc);
        return inc;
      } catch { return _addIncident(type, zone_id, reported_by); }
    };

    /* addOrder → POST /api/orders */
    const _addOrder = VenueDB.addOrder.bind(VenueDB);
    VenueDB.addOrder = async function(attendee_id, items) {
      if (!connected) {return _addOrder(attendee_id, items);}
      try {
        const att = VenueDB.attendees.find(a => a.attendee_id === attendee_id);
        const resp = await fetch(`${BASE}/api/orders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ attendee_id, items, delivery_zone: att?.current_zone || 'Z01' }),
        });
        const ord = await resp.json();
        if (!VenueDB.orders.find(o => o.order_id === ord.order_id)) {
          VenueDB.orders.unshift(ord);
        }
        if (att) {att.order_id = ord.order_id;}
        VenueDB.emit('order:new', ord);
        return ord;
      } catch { return _addOrder(attendee_id, items); }
    };

    /* addMessage → POST /api/messages */
    const _addMessage = VenueDB.addMessage.bind(VenueDB);
    VenueDB.addMessage = async function(from_staff, to_zone, body) {
      if (!connected) {return _addMessage(from_staff, to_zone, body);}
      try {
        const resp = await fetch(`${BASE}/api/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ from_staff, to_zone, body }),
        });
        const msg = await resp.json();
        if (!VenueDB.messages.find(m => m.msg_id === msg.msg_id)) {
          VenueDB.messages.unshift(msg);
        }
        VenueDB.emit('message:new', msg);
        return msg;
      } catch { return _addMessage(from_staff, to_zone, body); }
    };

    /* updateQueue → PATCH /api/queues/:id */
    const _updateQueue = VenueDB.updateQueue.bind(VenueDB);
    VenueDB.updateQueue = async function(qid, length) {
      if (!connected) {return _updateQueue(qid, length);}
      try {
        const resp = await fetch(`${BASE}/api/queues/${qid}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ current_length: length }),
        });
        const q = await resp.json();
        mergeArray(VenueDB.queues, [q], 'queue_id');
        VenueDB.emit('queue:update', q);
        return q;
      } catch { return _updateQueue(qid, length); }
    };

    /* resolveIncident → PATCH /api/incidents/:id */
    const _resolveIncident = VenueDB.resolveIncident.bind(VenueDB);
    VenueDB.resolveIncident = async function(id) {
      if (!connected) {return _resolveIncident(id);}
      try {
        const resp = await fetch(`${BASE}/api/incidents/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'resolved' }),
        });
        const inc = await resp.json();
        mergeArray(VenueDB.incidents, [inc], 'incident_id');
        VenueDB.emit('incident:resolved', inc);
        return inc;
      } catch { return _resolveIncident(id); }
    };

    /* addNotification → POST /api/notifications */
    const _addNotification = VenueDB.addNotification.bind(VenueDB);
    VenueDB.addNotification = async function(type, title, body) {
      if (!connected) {return _addNotification(type, title, body);}
      try {
        const resp = await fetch(`${BASE}/api/notifications`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type, title, body }),
        });
        return await resp.json();
      } catch { return _addNotification(type, title, body); }
    };

    console.log('[API] VenueDB write methods patched to use REST API ✅');
  }

  /* ── Lost & Found submission via API ─────────────────────── */
  VenueDB.submitLostFound = async function(entry) {
    if (!connected) {
      const e = { lf_id: `LF${Date.now()}`, ...entry, time: new Date() };
      VenueDB.lostFound.unshift(e);
      return e;
    }
    try {
      const resp = await fetch(`${BASE}/api/lost-found`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      });
      const e = await resp.json();
      VenueDB.lostFound.unshift(e);
      return e;
    } catch {
      const e = { lf_id: `LF${Date.now()}`, ...entry, time: new Date() };
      VenueDB.lostFound.unshift(e);
      return e;
    }
  };

  /* ── Expose connection status ─────────────────────────────── */
  VenueDB.isServerConnected = () => connected;
  VenueDB.getServerBase     = () => BASE;

  /* ── Boot sequence ───────────────────────────────────────── */
  function boot() {
    if (typeof VenueDB === 'undefined') {
      console.error('[API] VenueDB not found — ensure data.js loads before api.js');
      return;
    }
    patchVenueDB();
    connect();
  }

  /* Run after DOM ready (ensures data.js + utils.js are loaded) */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();
