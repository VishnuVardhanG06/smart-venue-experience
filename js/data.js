/* ================================================================
   SMART VENUE EXPERIENCE — Shared Data Layer (Mock / Simulation)
   All 7 Antigravity tables with live-updating simulation
   ================================================================ */

const VenueDB = (() => {

  /* ── Zones ─────────────────────────────────────────────────── */
  const zones = [
    { zone_id:'Z01', zone_name:'North Stand',    capacity:8500,  current_occupancy:7820, status:'alert',    last_updated: new Date() },
    { zone_id:'Z02', zone_name:'South Stand',    capacity:8500,  current_occupancy:5100, status:'normal',   last_updated: new Date() },
    { zone_id:'Z03', zone_name:'East Wing',      capacity:6200,  current_occupancy:4030, status:'normal',   last_updated: new Date() },
    { zone_id:'Z04', zone_name:'West Wing',      capacity:6200,  current_occupancy:5890, status:'alert',    last_updated: new Date() },
    { zone_id:'Z05', zone_name:'VIP Pavilion',   capacity:1200,  current_occupancy:980,  status:'normal',   last_updated: new Date() },
    { zone_id:'Z06', zone_name:'Concourse A',    capacity:3000,  current_occupancy:2890, status:'critical', last_updated: new Date() },
    { zone_id:'Z07', zone_name:'Concourse B',    capacity:3000,  current_occupancy:1240, status:'normal',   last_updated: new Date() },
    { zone_id:'Z08', zone_name:'Field Level',    capacity:500,   current_occupancy:420,  status:'normal',   last_updated: new Date() },
  ];

  /* ── Gates ─────────────────────────────────────────────────── */
  const gates = [
    { gate_id:'G01', zone_id:'Z01', gate_type:'entry', queue_length:120, avg_wait_minutes:14, is_open:true,  camera_feed_url:'#cam-g01' },
    { gate_id:'G02', zone_id:'Z01', gate_type:'entry', queue_length:45,  avg_wait_minutes:6,  is_open:true,  camera_feed_url:'#cam-g02' },
    { gate_id:'G03', zone_id:'Z02', gate_type:'entry', queue_length:20,  avg_wait_minutes:3,  is_open:true,  camera_feed_url:'#cam-g03' },
    { gate_id:'G04', zone_id:'Z02', gate_type:'exit',  queue_length:0,   avg_wait_minutes:0,  is_open:true,  camera_feed_url:'#cam-g04' },
    { gate_id:'G05', zone_id:'Z03', gate_type:'entry', queue_length:62,  avg_wait_minutes:8,  is_open:true,  camera_feed_url:'#cam-g05' },
    { gate_id:'G06', zone_id:'Z04', gate_type:'entry', queue_length:98,  avg_wait_minutes:12, is_open:true,  camera_feed_url:'#cam-g06' },
    { gate_id:'G07', zone_id:'Z05', gate_type:'entry', queue_length:5,   avg_wait_minutes:1,  is_open:true,  camera_feed_url:'#cam-g07' },
    { gate_id:'G08', zone_id:'Z06', gate_type:'entry', queue_length:180, avg_wait_minutes:22, is_open:true,  camera_feed_url:'#cam-g08' },
    { gate_id:'G09', zone_id:'Z06', gate_type:'exit',  queue_length:30,  avg_wait_minutes:4,  is_open:true,  camera_feed_url:'#cam-g09' },
    { gate_id:'G10', zone_id:'Z07', gate_type:'entry', queue_length:15,  avg_wait_minutes:2,  is_open:true,  camera_feed_url:'#cam-g10' },
  ];

  /* ── Queues ────────────────────────────────────────────────── */
  const queues = [
    { queue_id:'Q01', facility_type:'food',     location_name:'Burger Bay - Z01',     zone_id:'Z01', current_length:22, estimated_wait_min:12, last_updated: new Date() },
    { queue_id:'Q02', facility_type:'food',     location_name:'Nacho Nation - Z01',   zone_id:'Z01', current_length:8,  estimated_wait_min:4,  last_updated: new Date() },
    { queue_id:'Q03', facility_type:'restroom', location_name:'Restroom Block NE',    zone_id:'Z01', current_length:14, estimated_wait_min:7,  last_updated: new Date() },
    { queue_id:'Q04', facility_type:'food',     location_name:'Pizza Plaza - Z02',    zone_id:'Z02', current_length:5,  estimated_wait_min:3,  last_updated: new Date() },
    { queue_id:'Q05', facility_type:'merch',    location_name:'Team Store - Z02',     zone_id:'Z02', current_length:18, estimated_wait_min:9,  last_updated: new Date() },
    { queue_id:'Q06', facility_type:'food',     location_name:'Drinks Depot - Z03',   zone_id:'Z03', current_length:11, estimated_wait_min:5,  last_updated: new Date() },
    { queue_id:'Q07', facility_type:'restroom', location_name:'Restroom Block SW',    zone_id:'Z04', current_length:20, estimated_wait_min:11, last_updated: new Date() },
    { queue_id:'Q08', facility_type:'food',     location_name:'VIP Lounge Kitchen',   zone_id:'Z05', current_length:2,  estimated_wait_min:1,  last_updated: new Date() },
    { queue_id:'Q09', facility_type:'food',     location_name:'Hot Dogs & More - CA', zone_id:'Z06', current_length:35, estimated_wait_min:18, last_updated: new Date() },
    { queue_id:'Q10', facility_type:'merch',    location_name:'Main Merch Hub - CB',  zone_id:'Z07', current_length:10, estimated_wait_min:5,  last_updated: new Date() },
  ];

  /* ── Staff ─────────────────────────────────────────────────── */
  const staff = [
    { staff_id:'S01', name:'Riya Mehta',      role:'Zone Supervisor', assigned_zone:'Z01', contact_channel:'radio-01', availability_status:'available' },
    { staff_id:'S02', name:'Arjun Patel',     role:'Gate Marshal',    assigned_zone:'Z01', contact_channel:'radio-02', availability_status:'busy' },
    { staff_id:'S03', name:'Kavya Nair',      role:'Gate Marshal',    assigned_zone:'Z02', contact_channel:'radio-03', availability_status:'available' },
    { staff_id:'S04', name:'Vikram Singh',    role:'Zone Supervisor', assigned_zone:'Z03', contact_channel:'radio-04', availability_status:'available' },
    { staff_id:'S05', name:'Priya Sharma',    role:'Medical',         assigned_zone:'Z04', contact_channel:'radio-05', availability_status:'available' },
    { staff_id:'S06', name:'Deepak Kumar',    role:'Gate Marshal',    assigned_zone:'Z05', contact_channel:'radio-06', availability_status:'available' },
    { staff_id:'S07', name:'Anjali Rao',      role:'Zone Supervisor', assigned_zone:'Z06', contact_channel:'radio-07', availability_status:'busy' },
    { staff_id:'S08', name:'Karan Verma',     role:'Delivery Runner', assigned_zone:'Z06', contact_channel:'radio-08', availability_status:'available' },
    { staff_id:'S09', name:'Sneha Iyer',      role:'Delivery Runner', assigned_zone:'Z07', contact_channel:'radio-09', availability_status:'available' },
    { staff_id:'S10', name:'Rahul Gupta',     role:'Security',        assigned_zone:'Z08', contact_channel:'radio-10', availability_status:'busy' },
    { staff_id:'S11', name:'Meera Joshi',     role:'Medical',         assigned_zone:'Z01', contact_channel:'radio-11', availability_status:'available' },
    { staff_id:'S12', name:'Siddharth Das',   role:'Gate Marshal',    assigned_zone:'Z04', contact_channel:'radio-12', availability_status:'available' },
  ];

  /* ── Incidents ─────────────────────────────────────────────── */
  const incidentTypes = ['crowd_surge','medical','security','lost_item','facility_fault','vandalism'];
  const incidents = [
    { incident_id:'INC001', type:'crowd_surge',    zone_id:'Z06', reported_by:'Sensor-Z06',  assigned_staff_id:'S07', status:'in-progress', timestamp: new Date(Date.now()-18*60000), escalated: false },
    { incident_id:'INC002', type:'medical',         zone_id:'Z01', reported_by:'ATT-1042',    assigned_staff_id:'S11', status:'in-progress', timestamp: new Date(Date.now()-7*60000),  escalated: false },
    { incident_id:'INC003', type:'lost_item',       zone_id:'Z02', reported_by:'ATT-3019',    assigned_staff_id:'S03', status:'open',        timestamp: new Date(Date.now()-2*60000),  escalated: false },
    { incident_id:'INC004', type:'facility_fault',  zone_id:'Z04', reported_by:'S12',         assigned_staff_id:'S12', status:'open',        timestamp: new Date(Date.now()-1*60000),  escalated: false },
    { incident_id:'INC005', type:'security',        zone_id:'Z03', reported_by:'ATT-8821',    assigned_staff_id:'S04', status:'resolved',    timestamp: new Date(Date.now()-45*60000), escalated: false },
    { incident_id:'INC006', type:'crowd_surge',    zone_id:'Z01', reported_by:'Sensor-Z01',  assigned_staff_id:'S01', status:'in-progress', timestamp: new Date(Date.now()-11*60000), escalated: false },
  ];

  /* ── Attendees (sample) ────────────────────────────────────── */
  const attendees = [
    { attendee_id:'ATT001', ticket_id:'TKT-10042', seat_number:'N12-Row8-Seat14', entry_gate:'G01', preferences:['food','merch'], notification_opt_in:true, current_zone:'Z01', order_id:'ORD001' },
    { attendee_id:'ATT002', ticket_id:'TKT-10189', seat_number:'S04-Row2-Seat7',  entry_gate:'G03', preferences:['restroom'],     notification_opt_in:true, current_zone:'Z02', order_id:null    },
    { attendee_id:'ATT003', ticket_id:'TKT-10561', seat_number:'E07-Row5-Seat22', entry_gate:'G05', preferences:['food'],          notification_opt_in:false,current_zone:'Z03', order_id:'ORD002' },
    { attendee_id:'ATT004', ticket_id:'VIP-00021', seat_number:'VIP-A-Seat3',     entry_gate:'G07', preferences:['food','VIP'],    notification_opt_in:true, current_zone:'Z05', order_id:'ORD003' },
  ];

  /* ── Orders ────────────────────────────────────────────────── */
  const orders = [
    { order_id:'ORD001', attendee_id:'ATT001', items:[{name:'Classic Burger',qty:1,price:280},{name:'Cola Large',qty:2,price:120}], status:'preparing', delivery_zone:'Z01', timestamp: new Date(Date.now()-8*60000),  total:520 },
    { order_id:'ORD002', attendee_id:'ATT003', items:[{name:'Nachos Combo',qty:1,price:220}],                                         status:'ready',     delivery_zone:'Z03', timestamp: new Date(Date.now()-12*60000), total:220 },
    { order_id:'ORD003', attendee_id:'ATT004', items:[{name:'VIP Platter',qty:1,price:1200},{name:'Premium Juice',qty:1,price:180}],  status:'delivered', delivery_zone:'Z05', timestamp: new Date(Date.now()-25*60000), total:1380 },
    { order_id:'ORD004', attendee_id:'ATT002', items:[{name:'Hot Dog',qty:2,price:160},{name:'Water Bottle',qty:1,price:60}],          status:'placed',    delivery_zone:'Z02', timestamp: new Date(Date.now()-2*60000),  total:380 },
  ];

  /* ── Notification log ──────────────────────────────────────── */
  const notifications = [
    { id:'N01', type:'warning', title:'Crowd Surge Alert',       body:'North Stand approaching capacity. Use Gate G02 or G03.',       time: new Date(Date.now()-5*60000),  read:false },
    { id:'N02', type:'info',    title:'Queue Update',            body:'Nacho Nation near you has a short wait — under 5 min!',        time: new Date(Date.now()-12*60000), read:false },
    { id:'N03', type:'success', title:'Order Update',            body:'Your order is on its way to seat N12-Row8-Seat14.',            time: new Date(Date.now()-20*60000), read:true  },
    { id:'N04', type:'info',    title:'Event Moment',            body:'Half-time in 8 minutes. Restroom Block NE is less busy now.', time: new Date(Date.now()-30*60000), read:true  },
    { id:'N05', type:'warning', title:'Gate Redirect',           body:'Gate G01 congested. Please use Gate G02 — same zone.',        time: new Date(Date.now()-35*60000), read:true  },
  ];

  /* ── Message log ───────────────────────────────────────────── */
  const messages = [
    { msg_id:'M01', from_staff:'S01', from_name:'Riya Mehta',    to_zone:'Z01', body:'Gate G01 needs extra marshals — deploy 2 more.',              time: new Date(Date.now()-10*60000) },
    { msg_id:'M02', from_staff:'S07', from_name:'Anjali Rao',    to_zone:'Z06', body:'Concourse A is at 96% capacity. Redirecting flow to CB.',      time: new Date(Date.now()-8*60000)  },
    { msg_id:'M03', from_staff:'S04', from_name:'Vikram Singh',  to_zone:'ALL', body:'Medical team needed at Zone 01 Row 8. ETA 2 min.',             time: new Date(Date.now()-6*60000)  },
    { msg_id:'M04', from_staff:'S02', from_name:'Arjun Patel',   to_zone:'Z01', body:'G01 queue reducing. Wait time down to 8 min.',                 time: new Date(Date.now()-3*60000)  },
    { msg_id:'M05', from_staff:'S09', from_name:'Sneha Iyer',    to_zone:'Z07', body:'Merch hub queue building. May need extra counter.',            time: new Date(Date.now()-1*60000)  },
  ];

  /* ── Menu items ────────────────────────────────────────────── */
  const menuItems = [
    { item_id:'MI01', category:'burgers',  name:'Classic Burger',    description:'Juicy beef patty, lettuce, tomato',   price:280, prep_min:8,  available:true, emoji:'🍔' },
    { item_id:'MI02', category:'burgers',  name:'Double Stack',      description:'Double patty with special sauce',      price:380, prep_min:10, available:true, emoji:'🍔' },
    { item_id:'MI03', category:'snacks',   name:'Nachos Combo',      description:'Nachos with salsa & cheese dip',       price:220, prep_min:5,  available:true, emoji:'🌮' },
    { item_id:'MI04', category:'snacks',   name:'Hot Dog Classic',   description:'Beef sausage in toasted bun',          price:160, prep_min:4,  available:true, emoji:'🌭' },
    { item_id:'MI05', category:'snacks',   name:'French Fries Large',description:'Crispy golden fries',                  price:140, prep_min:5,  available:true, emoji:'🍟' },
    { item_id:'MI06', category:'pizza',    name:'Margherita Slice',  description:'Classic tomato & mozzarella',          price:180, prep_min:3,  available:true, emoji:'🍕' },
    { item_id:'MI07', category:'pizza',    name:'Pepperoni Slice',   description:'Pepperoni with extra cheese',          price:200, prep_min:3,  available:false,emoji:'🍕' },
    { item_id:'MI08', category:'drinks',   name:'Cola Large',        description:'Chilled 500ml fizzy drink',            price:120, prep_min:1,  available:true, emoji:'🥤' },
    { item_id:'MI09', category:'drinks',   name:'Premium Juice',     description:'Fresh-pressed orange juice',           price:180, prep_min:2,  available:true, emoji:'🧃' },
    { item_id:'MI10', category:'drinks',   name:'Water Bottle',      description:'500ml mineral water',                  price:60,  prep_min:0,  available:true, emoji:'💧' },
    { item_id:'MI11', category:'vip',      name:'VIP Platter',       description:'Assorted premium snacks & drinks',     price:1200,prep_min:12, available:true, emoji:'🥂' },
  ];

  /* ── Lost & Found ──────────────────────────────────────────── */
  const lostFound = [
    { lf_id:'LF001', type:'lost', item:'Blue backpack with laptop',  zone_id:'Z01', reported_by:'ATT001', time: new Date(Date.now()-40*60000), status:'searching', photo:null },
    { lf_id:'LF002', type:'found',item:'Child\'s red cap',           zone_id:'Z02', reported_by:'S03',    time: new Date(Date.now()-25*60000), status:'held',      photo:null },
    { lf_id:'LF003', type:'lost', item:'Black wallet near section E', zone_id:'Z03', reported_by:'ATT003', time: new Date(Date.now()-15*60000), status:'searching', photo:null },
  ];

  /* ── Simulation helpers ────────────────────────────────────── */
  function randomDelta(val, min, max, lower=0, upper=Infinity) {
    const delta = Math.floor(Math.random() * (max - min + 1)) + min;
    return Math.max(lower, Math.min(upper, val + delta));
  }
  function computeZoneStatus(zone) {
    const pct = zone.current_occupancy / zone.capacity;
    if (pct >= 0.96) return 'critical';
    if (pct >= 0.85) return 'alert';
    return 'normal';
  }
  function computeGateWait(ql) { return Math.max(0, Math.round(ql * 0.12)); }

  const listeners = [];
  function on(event, cb) { listeners.push({ event, cb }); }
  function emit(event, data) { listeners.filter(l=>l.event===event||l.event==='*').forEach(l=>l.cb(data,event)); }

  /* Live tick — simulates IoT sensor updates every 6s */
  function startSimulation() {
    setInterval(() => {
      zones.forEach(z => {
        z.current_occupancy = randomDelta(z.current_occupancy, -80, 120, 0, z.capacity);
        const prevStatus = z.status;
        z.status = computeZoneStatus(z);
        z.last_updated = new Date();
        if (prevStatus !== z.status && z.status === 'alert') {
          emit('zone:alert', z);
          WorkflowEngine.triggerId1(z);
        }
        if (prevStatus !== z.status && z.status === 'critical') {
          emit('zone:critical', z);
          WorkflowEngine.triggerId1(z);
        }
      });
      gates.forEach(g => {
        g.queue_length = randomDelta(g.queue_length, -12, 18, 0, 250);
        g.avg_wait_minutes = computeGateWait(g.queue_length);
      });
      queues.forEach(q => {
        const prevWait = q.estimated_wait_min;
        q.current_length = randomDelta(q.current_length, -3, 5, 0, 60);
        q.estimated_wait_min = Math.max(0, Math.round(q.current_length * 0.4));
        q.last_updated = new Date();
        if (prevWait >= 5 && q.estimated_wait_min < 5) {
          WorkflowEngine.triggerId2(q);
        }
      });
      emit('tick', { zones, gates, queues, staff, incidents });
    }, 6000);

    /* Order progression every 15 seconds */
    setInterval(() => {
      orders.forEach(o => {
        const progression = { placed:'preparing', preparing:'ready', ready:'delivered' };
        if (progression[o.status]) {
          const prev = o.status;
          if (Math.random() > 0.65) {
            o.status = progression[o.status];
            emit('order:update', o);
            if (o.status === 'ready') WorkflowEngine.triggerId4(o);
          }
        }
      });
    }, 15000);

    /* Incident auto-escalation check every 30s */
    setInterval(() => WorkflowEngine.checkEscalations(), 30000);
  }

  /* ── Public API ────────────────────────────────────────────── */
  return {
    zones, gates, queues, staff, incidents, attendees, orders,
    notifications, messages, menuItems, lostFound,
    on, emit, startSimulation,
    getZone: id => zones.find(z => z.zone_id === id),
    getGate: id => gates.find(g => g.gate_id === id),
    getStaff: id => staff.find(s => s.staff_id === id),
    getZoneStaff: zid => staff.filter(s => s.assigned_zone === zid),
    getZoneGates: zid => gates.filter(g => g.zone_id === zid),
    getZoneQueues: zid => queues.filter(q => q.zone_id === zid),
    getOpenIncidents: () => incidents.filter(i => i.status !== 'resolved'),
    addIncident: (type, zone_id, reported_by) => {
      const inc = {
        incident_id: `INC${String(incidents.length+1).padStart(3,'0')}`,
        type, zone_id, reported_by,
        assigned_staff_id: null,
        status: 'open',
        timestamp: new Date(),
        escalated: false
      };
      incidents.unshift(inc);
      emit('incident:new', inc);
      WorkflowEngine.triggerId3(inc);
      return inc;
    },
    addMessage: (from_staff_id, to_zone, body) => {
      const member = staff.find(s=>s.staff_id===from_staff_id);
      const msg = {
        msg_id: `M${String(messages.length+1).padStart(2,'0')}`,
        from_staff: from_staff_id,
        from_name: member?.name || 'Unknown',
        to_zone, body,
        time: new Date()
      };
      messages.unshift(msg);
      emit('message:new', msg);
      return msg;
    },
    addOrder: (attendee_id, items) => {
      const total = items.reduce((s,i)=>s+i.price*i.qty, 0);
      const att = attendees.find(a=>a.attendee_id===attendee_id);
      const ord = {
        order_id: `ORD${String(orders.length+1).padStart(3,'0')}`,
        attendee_id, items, status:'placed',
        delivery_zone: att?.current_zone || 'Z01',
        timestamp: new Date(), total
      };
      orders.unshift(ord);
      if (att) att.order_id = ord.order_id;
      emit('order:new', ord);
      return ord;
    },
    addNotification: (type, title, body) => {
      const n = { id:`N${Date.now()}`, type, title, body, time:new Date(), read:false };
      notifications.unshift(n);
      emit('notification:new', n);
      return n;
    },
    resolveIncident: id => {
      const inc = incidents.find(i=>i.incident_id===id);
      if (inc) { inc.status='resolved'; emit('incident:resolved', inc); }
    },
    updateQueue: (qid, length) => {
      const q = queues.find(x=>x.queue_id===qid);
      if (q) { q.current_length=length; q.estimated_wait_min=Math.max(0,Math.round(length*0.4)); q.last_updated=new Date(); emit('queue:update',q); }
    },
    occupancyPct: z => Math.round((z.current_occupancy / z.capacity) * 100),
    formatTime: d => { if(!d) return '—'; const now=new Date(); const diff=Math.floor((now-d)/60000); if(diff<1) return 'just now'; if(diff<60) return `${diff}m ago`; return `${Math.floor(diff/60)}h ${diff%60}m ago`; }
  };
})();
