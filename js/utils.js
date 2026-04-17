/* ================================================================
   SMART VENUE EXPERIENCE — Shared UI Utilities
   Toast system, chart draw helpers, shared component renderers
   ================================================================ */

/* ── Toast System ──────────────────────────────────────────── */
function showToast(title, body, type = 'info', duration = 4500) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const icons = { info:'ℹ️', success:'✅', warning:'⚠️', danger:'🚨' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || 'ℹ️'}</span>
    <div>
      <div class="toast-title">${title}</div>
      ${body ? `<div class="toast-body">${body}</div>` : ''}
    </div>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('exit');
    setTimeout(() => toast.remove(), 350);
  }, duration);
}

/* ── Tab Switcher ──────────────────────────────────────────── */
function initTabs(barId, pagePrefix) {
  const bar = document.getElementById(barId);
  if (!bar) return;
  bar.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      bar.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const page = btn.dataset.tab;
      document.querySelectorAll(`[data-page]`).forEach(p => {
        p.classList.toggle('active', p.dataset.page === page);
      });
    });
  });
}

/* ── Simple bar chart on <canvas> ──────────────────────────── */
function drawBarChart(canvas, labels, values, opts = {}) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width = canvas.offsetWidth;
  const H = canvas.height = canvas.offsetHeight || 180;
  ctx.clearRect(0, 0, W, H);

  const pad = { top: 20, right: 16, bottom: 40, left: 36 };
  const max  = Math.max(...values, 1);
  const barW = (W - pad.left - pad.right) / labels.length - 6;

  /* Grid lines */
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = pad.top + ((H - pad.top - pad.bottom) / 4) * i;
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(W - pad.right, y); ctx.stroke();
    ctx.fillStyle = 'rgba(136,150,179,0.6)';
    ctx.font = '10px Inter';
    ctx.textAlign = 'right';
    ctx.fillText(Math.round(max - (max / 4) * i), pad.left - 4, y + 4);
  }

  /* Bars */
  labels.forEach((lbl, i) => {
    const val = values[i];
    const x = pad.left + i * ((W - pad.left - pad.right) / labels.length) + 3;
    const barH = ((H - pad.top - pad.bottom) * val) / max;
    const y = H - pad.bottom - barH;

    const color = opts.colors ? opts.colors[i] : getStatusColor(val, opts.threshold || max * 0.85);
    const grad = ctx.createLinearGradient(x, y, x, H - pad.bottom);
    grad.addColorStop(0, color);
    grad.addColorStop(1, color.replace(')', ', 0.3)').replace('rgb', 'rgba'));

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(x, y, barW, barH, 4);
    ctx.fill();

    /* Label */
    ctx.fillStyle = 'rgba(136,150,179,0.9)';
    ctx.font = '9px Inter';
    ctx.textAlign = 'center';
    ctx.fillText(lbl, x + barW / 2, H - pad.bottom + 14);

    /* Value on top */
    if (val > 0) {
      ctx.fillStyle = '#e8eaf6';
      ctx.font = 'bold 10px Inter';
      ctx.fillText(val, x + barW / 2, y - 4);
    }
  });
}

/* ── Donut / Gauge chart ───────────────────────────────────── */
function drawGauge(canvas, pct, opts = {}) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width  = canvas.offsetWidth;
  const H = canvas.height = canvas.offsetHeight || W;
  ctx.clearRect(0, 0, W, H);

  const cx = W / 2, cy = H / 2, r = Math.min(W, H) * 0.38;
  const startAngle = Math.PI * 0.75;
  const endAngle   = startAngle + Math.PI * 1.5 * (pct / 100);
  const trackColor = 'rgba(255,255,255,0.06)';
  const fillColor  = opts.color || getStatusColorByPct(pct);

  /* Track */
  ctx.beginPath();
  ctx.arc(cx, cy, r, startAngle, startAngle + Math.PI * 1.5);
  ctx.strokeStyle = trackColor;
  ctx.lineWidth = 12;
  ctx.lineCap = 'round';
  ctx.stroke();

  /* Fill */
  if (pct > 0) {
    const grad = ctx.createLinearGradient(cx-r, cy-r, cx+r, cy+r);
    grad.addColorStop(0, fillColor);
    grad.addColorStop(1, lighten(fillColor));
    ctx.beginPath();
    ctx.arc(cx, cy, r, startAngle, endAngle);
    ctx.strokeStyle = grad;
    ctx.lineWidth = 12;
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  /* Label */
  ctx.fillStyle = '#e8eaf6';
  ctx.font = `bold ${Math.round(W*0.16)}px Outfit`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${pct}%`, cx, cy);

  ctx.fillStyle = 'rgba(136,150,179,0.7)';
  ctx.font = `${Math.round(W*0.07)}px Inter`;
  ctx.fillText(opts.label || '', cx, cy + W * 0.12);
}

/* ── Line sparkline ────────────────────────────────────────── */
function drawSparkline(canvas, values, color = '#2979ff') {
  const ctx = canvas.getContext('2d');
  const W   = canvas.width  = canvas.offsetWidth;
  const H   = canvas.height = canvas.offsetHeight || 60;
  ctx.clearRect(0, 0, W, H);

  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const pts = values.map((v, i) => ({
    x: (i / (values.length - 1)) * W,
    y: H - ((v - min) / range) * (H * 0.8) - H * 0.1
  }));

  /* Area fill */
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, color.replace(')', ', 0.3)').replace('#', 'rgba(').replace(')', ',0.3)') || 'rgba(41,121,255,0.3)');
  grad.addColorStop(1, 'transparent');

  ctx.beginPath();
  ctx.moveTo(pts[0].x, H);
  pts.forEach(p => ctx.lineTo(p.x, p.y));
  ctx.lineTo(pts[pts.length-1].x, H);
  ctx.closePath();
  try { ctx.fillStyle = grad; ctx.fill(); } catch(e) {}

  /* Line */
  ctx.beginPath();
  pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.stroke();
}

/* ── Colour helpers ────────────────────────────────────────── */
function getStatusColor(val, threshold) {
  if (val >= threshold * 1.15) return 'rgb(255,23,68)';
  if (val >= threshold)         return 'rgb(255,171,0)';
  return 'rgb(41,121,255)';
}
function getStatusColorByPct(pct) {
  if (pct >= 96) return '#ff1744';
  if (pct >= 85) return '#ffab00';
  return '#2979ff';
}
function lighten(hex) {
  return hex.replace(/(\d+)/g, (m, n) => Math.min(255, parseInt(n) + 40));
}

/* ── Relative time ─────────────────────────────────────────── */
function relTime(d) {
  if (!d) return '—';
  const diff = Math.floor((new Date() - new Date(d)) / 60000);
  if (diff < 1)  return 'just now';
  if (diff < 60) return `${diff}m ago`;
  return `${Math.floor(diff/60)}h ${diff % 60}m ago`;
}

/* ── Status badge HTML ─────────────────────────────────────── */
function statusBadge(status) {
  const map = {
    normal:      'badge-normal',
    alert:       'badge-alert',
    critical:    'badge-critical',
    open:        'badge-alert',
    'in-progress':'badge-blue',
    resolved:    'badge-normal',
    placed:      'badge-cyan',
    preparing:   'badge-alert',
    ready:       'badge-violet',
    delivered:   'badge-normal',
    available:   'badge-normal',
    busy:        'badge-alert',
  };
  return `<span class="badge badge-dot ${map[status]||'badge-cyan'}">${status}</span>`;
}

/* ── Incident type icon ────────────────────────────────────── */
function incidentIcon(type) {
  const m = { crowd_surge:'👥', medical:'🏥', security:'🔒', lost_item:'🎒', facility_fault:'🔧', vandalism:'⚠️' };
  return m[type] || '📋';
}

/* ── Format currency ───────────────────────────────────────── */
function formatCurrency(amount) {
  return `₹${amount.toLocaleString('en-IN')}`;
}

/* ── Occupancy fill class ──────────────────────────────────── */
function occupancyClass(pct) {
  if (pct >= 96) return 'progress-critical';
  if (pct >= 85) return 'progress-alert';
  return 'progress-normal';
}

/* ── Init global state ─────────────────────────────────────── */
window.SVE_CURRENT_STAFF = 'S01'; // Logged-in staff member for staff portal
window.SVE_CURRENT_ATTENDEE = 'ATT001'; // Logged-in attendee
