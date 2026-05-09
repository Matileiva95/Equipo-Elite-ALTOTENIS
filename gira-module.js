/* ─── MÓDULO GIRA ─── */
const GIRA_GROUPS = [
  { id: 'all', name: 'Todos', color: '#333333' },
  { id: 'af18ac1d-9ea2-441f-b83b-023afd315bfc', name: 'Elite', color: '#1A1A2E' },
  { id: 'fdb992b2-b5c7-4f3a-8c2e-1d9e5a6b7c8d', name: 'F2', color: '#1A6FD4' },
  { id: 'e15be2e1-3c4d-4e5f-9a1b-2c3d4e5f6a7b', name: 'F1', color: '#06B6D4' }
];
const GIRA_WEEKS = [
  "04 May – 10 May","11 May – 17 May","18 May – 24 May","25 May – 31 May",
  "01 Jun – 07 Jun","08 Jun – 14 Jun","15 Jun – 21 Jun","22 Jun – 28 Jun",
  "29 Jun – 05 Jul","06 Jul – 12 Jul","13 Jul – 19 Jul","20 Jul – 26 Jul",
  "27 Jul – 02 Ago","03 Ago – 09 Ago","10 Ago – 16 Ago","17 Ago – 23 Ago",
  "24 Ago – 30 Ago","31 Ago – 06 Sep","07 Sep – 13 Sep","14 Sep – 20 Sep",
  "21 Sep – 27 Sep","28 Sep – 04 Oct","05 Oct – 11 Oct","12 Oct – 18 Oct",
  "19 Oct – 25 Oct","26 Oct – 01 Nov","02 Nov – 08 Nov","09 Nov – 15 Nov",
  "16 Nov – 22 Nov","23 Nov – 29 Nov","30 Nov – 06 Dic","07 Dic – 13 Dic",
  "14 Dic – 20 Dic","21 Dic – 27 Dic","28 Dic – 03 Ene"
];
const GIRA_LEVELS = [
  'GRAND SLAM','ATP 1000','ATP 500','ATP 250','WTA 125','W100',
  'CH 125','CH 100','CH 75','CH 50','M25','M15','W75','W35','W15',
  'J500','J300','J200','J100','J60','J30','ENTRENAMIENTO','OTRO'
];
let giraActiveGroup = 'all';
let giraEvents = [];
let giraPlayers = [];
let giraCoaches = [];

async function renderGira() {
  document.querySelectorAll('.mnav-btn').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById('mnav-gira');
  if (btn) btn.classList.add('active');
  const m = document.getElementById('main');
  m.innerHTML = `
    <div style="padding:16px 16px 100px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
        <div>
          <div style="font-size:18px;font-weight:700;color:#333">✈ Gira 2026</div>
          <div style="font-size:12px;color:#888;margin-top:2px">Control semanal · May – Dic 2026</div>
        </div>
        <button onclick="giraOpenAdd()" style="background:#FF6B00;color:#fff;border:none;padding:8px 14px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer">+ Evento</button>
      </div>
      <div style="display:flex;gap:6px;margin-bottom:16px;overflow-x:auto;padding-bottom:4px">
        ${GIRA_GROUPS.map(g => `
          <button onclick="giraSetGroup('${g.id}')" id="giratab-${g.id}"
            style="flex-shrink:0;padding:6px 14px;border-radius:20px;border:2px solid ${g.color};
            background:${giraActiveGroup===g.id ? g.color : 'transparent'};
            color:${giraActiveGroup===g.id ? '#fff' : g.color};
            font-size:13px;font-weight:600;cursor:pointer">${g.name}</button>`).join('')}
      </div>
      <div id="gira-metrics" style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:16px"></div>
      <div id="gira-body"><div style="text-align:center;padding:40px;color:#aaa;font-size:13px">Cargando...</div></div>
    </div>
    <div id="gira-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:200;align-items:flex-end;justify-content:center">
      <div style="background:#fff;border-radius:16px 16px 0 0;padding:20px;width:100%;max-width:500px;max-height:85vh;overflow-y:auto">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
          <div style="font-size:16px;font-weight:700" id="gira-modal-title">Nuevo evento</div>
          <button onclick="giraCloseModal()" style="background:none;border:none;font-size:20px;cursor:pointer;color:#666">✕</button>
        </div>
        <input type="hidden" id="gira-edit-id">
        <div style="margin-bottom:12px">
          <label style="font-size:12px;color:#666;display:block;margin-bottom:4px">Semana</label>
          <select id="gira-week" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:8px;font-size:13px">
            ${GIRA_WEEKS.map(w => `<option value="${w}">${w}</option>`).join('')}
          </select>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
          <div>
            <label style="font-size:12px;color:#666;display:block;margin-bottom:4px">Ciudad</label>
            <input id="gira-city" placeholder="Ej: SANTIAGO" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:8px;font-size:13px;box-sizing:border-box">
          </div>
          <div>
            <label style="font-size:12px;color:#666;display:block;margin-bottom:4px">País</label>
            <input id="gira-country" placeholder="Ej: CHILE" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:8px;font-size:13px;box-sizing:border-box">
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
          <div>
            <label style="font-size:12px;color:#666;display:block;margin-bottom:4px">Nivel</label>
            <select id="gira-level" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:8px;font-size:13px">
              ${GIRA_LEVELS.map(l => `<option value="${l}">${l}</option>`).join('')}
            </select>
          </div>
          <div>
            <label style="font-size:12px;color:#666;display:block;margin-bottom:4px">Superficie</label>
            <select id="gira-surface" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:8px;font-size:13px">
              <option value="ARCILLA">Arcilla</option>
              <option value="CEMENTO">Cemento</option>
              <option value="HIERBA">Hierba</option>
              <option value="INDOOR">Indoor</option>
            </select>
          </div>
        </div>
        <div style="margin-bottom:12px">
          <label style="font-size:12px;color:#666;display:block;margin-bottom:4px">Grupo</label>
          <select id="gira-group-sel" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:8px;font-size:13px">
            ${GIRA_GROUPS.map(g => `<option value="${g.id}">${g.name}</option>`).join('')}
          </select>
        </div>
        <div style="margin-bottom:12px">
          <label style="font-size:12px;color:#666;display:block;margin-bottom:8px">Jugadores</label>
          <div id="gira-player-sel" style="display:flex;flex-direction:column;gap:6px;max-height:180px;overflow-y:auto"></div>
        </div>
        <div style="margin-bottom:20px">
          <label style="font-size:12px;color:#666;display:block;margin-bottom:8px">Entrenadores</label>
          <div id="gira-coach-sel" style="display:flex;flex-direction:column;gap:6px;max-height:120px;overflow-y:auto"></div>
        </div>
        <button onclick="giraSaveEvent()" style="width:100%;background:#FF6B00;color:#fff;border:none;padding:12px;border-radius:8px;font-size:15px;font-weight:700;cursor:pointer">Guardar evento</button>
      </div>
    </div>`;
  await giraLoadData();
}

async function giraLoadData() {
  try {
    const url = giraActiveGroup === 'all' ? '/api/v1/gira' : `/api/v1/gira?group_id=${giraActiveGroup}`;
    const res = await apiFetch(url);
    giraEvents = res.data || [];
    const [pRes, cRes] = await Promise.all([
      apiFetch('/api/v1/players?limit=200'),
      apiFetch('/api/v1/coaches')
    ]);
    giraPlayers = pRes.data || [];
    giraCoaches = cRes.data || [];
    giraRenderMetrics();
    giraRenderCalendar();
  } catch(e) {
    const b = document.getElementById('gira-body');
    if (b) b.innerHTML = '<div style="text-align:center;padding:40px;color:#e55">Error cargando datos</div>';
  }
}

function giraSetGroup(groupId) {
  giraActiveGroup = groupId;
  GIRA_GROUPS.forEach(g => {
    const btn = document.getElementById(`giratab-${g.id}`);
    if (!btn) return;
    btn.style.background = g.id === groupId ? g.color : 'transparent';
    btn.style.color = g.id === groupId ? '#fff' : g.color;
  });
  giraLoadData();
}

function giraRenderMetrics() {
  const totalEvents = giraEvents.filter(e => e.level !== 'ENTRENAMIENTO').length;
  const countries = new Set(giraEvents.filter(e => e.level !== 'ENTRENAMIENTO').map(e => e.country)).size;
  const weeks = new Set(giraEvents.map(e => e.week)).size;
  const el = document.getElementById('gira-metrics');
  if (!el) return;
  el.innerHTML = `
    <div style="background:#fff;border-radius:10px;padding:12px;border:1px solid #eee;text-align:center">
      <div style="font-size:22px;font-weight:700;color:#FF6B00">${totalEvents}</div>
      <div style="font-size:11px;color:#888;margin-top:2px">Torneos</div>
    </div>
    <div style="background:#fff;border-radius:10px;padding:12px;border:1px solid #eee;text-align:center">
      <div style="font-size:22px;font-weight:700;color:#1DA1D6">${countries}</div>
      <div style="font-size:11px;color:#888;margin-top:2px">Países</div>
    </div>
    <div style="background:#fff;border-radius:10px;padding:12px;border:1px solid #eee;text-align:center">
      <div style="font-size:22px;font-weight:700;color:#333">${weeks}</div>
      <div style="font-size:11px;color:#888;margin-top:2px">Semanas</div>
    </div>`;
}

function giraLevelBadge(level) {
  const map = {'GRAND SLAM':'#412402','M25':'#0C447C','M15':'#185FA5','W75':'#72243E','W35':'#993556','W15':'#993C1D','ENTRENAMIENTO':'#3B6D11'};
  const bg = map[(level||'').toUpperCase()] || '#444';
  return `<span style="background:${bg};color:#fff;font-size:10px;font-weight:700;padding:2px 7px;border-radius:5px">${level}</span>`;
}

function giraRenderCalendar() {
  const body = document.getElementById('gira-body');
  if (!body) return;
  const byWeek = {};
  giraEvents.forEach(e => { if (!byWeek[e.week]) byWeek[e.week] = []; byWeek[e.week].push(e); });
  const weeksToShow = GIRA_WEEKS.filter(w => byWeek[w] && byWeek[w].length > 0);
  if (!weeksToShow.length) {
    body.innerHTML = '<div style="text-align:center;padding:40px;color:#aaa;font-size:13px">Sin eventos — agrega el primero con + Evento</div>';
    return;
  }
  body.innerHTML = weeksToShow.map(week => {
    const events = byWeek[week];
    return `<div style="background:#fff;border-radius:12px;border:1px solid #eee;overflow:hidden">
      <div style="background:#f7f7f5;padding:10px 14px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #eee">
        <span style="font-size:13px;font-weight:600">📅 ${week}</span>
        <span style="font-size:11px;background:#eee;color:#666;padding:2px 8px;border-radius:10px">${events.length} evento${events.length>1?'s':''}</span>
      </div>
      ${events.map(ev => {
        const playerNames = (ev.player_ids||[]).map(pid => { const p = giraPlayers.find(x=>x.id===pid); return p?p.full_name:null; }).filter(Boolean);
        const coachNames = (ev.coach_ids||[]).map(cid => { const c = giraCoaches.find(x=>x.id===cid); return c?c.name:null; }).filter(Boolean);
        return `<div style="padding:10px 14px;border-top:1px solid #f0f0f0;display:flex;align-items:flex-start;gap:10px">
          <div style="flex:1">
            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:4px">
              ${giraLevelBadge(ev.level)}
              ${ev.surface?`<span style="background:#eee;color:#555;font-size:10px;padding:2px 7px;border-radius:5px">${ev.surface}</span>`:''}
            </div>
            <div style="font-size:14px;font-weight:600;color:#333">${ev.city} · <span style="font-weight:400;color:#666">${ev.country}</span></div>
            ${playerNames.length?`<div style="font-size:12px;color:#888;margin-top:3px">👤 ${playerNames.join(', ')}</div>`:''}
            ${coachNames.length?`<div style="font-size:12px;color:#888;margin-top:2px">🎾 ${coachNames.join(', ')}</div>`:''}
          </div>
          <div style="display:flex;gap:6px">
            <button onclick="giraOpenEdit('${ev.id}')" style="background:#f0f4ff;color:#1A6FD4;border:none;padding:6px 10px;border-radius:6px;font-size:12px;cursor:pointer">✏</button>
            <button onclick="giraDeleteEvent('${ev.id}')" style="background:#fff0f0;color:#e55;border:none;padding:6px 10px;border-radius:6px;font-size:12px;cursor:pointer">✕</button>
          </div>
        </div>`;
      }).join('')}
    </div>`;
  }).join('');
}

function giraOpenAdd() {
  document.getElementById('gira-edit-id').value = '';
  document.getElementById('gira-modal-title').textContent = 'Nuevo evento';
  document.getElementById('gira-city').value = '';
  document.getElementById('gira-country').value = '';
  document.getElementById('gira-week').value = GIRA_WEEKS[0];
  document.getElementById('gira-level').value = 'M25';
  document.getElementById('gira-surface').value = 'ARCILLA';
  if (giraActiveGroup !== 'all') document.getElementById('gira-group-sel').value = giraActiveGroup;
  giraRenderPlayerSel([]);
  giraRenderCoachSel([]);
  document.getElementById('gira-modal').style.display = 'flex';
}

function giraOpenEdit(id) {
  const ev = giraEvents.find(e => e.id === id);
  if (!ev) return;
  document.getElementById('gira-edit-id').value = ev.id;
  document.getElementById('gira-modal-title').textContent = 'Editar evento';
  document.getElementById('gira-week').value = ev.week;
  document.getElementById('gira-city').value = ev.city;
  document.getElementById('gira-country').value = ev.country;
  document.getElementById('gira-level').value = ev.level;
  document.getElementById('gira-surface').value = ev.surface || 'ARCILLA';
  document.getElementById('gira-group-sel').value = ev.group_id || 'all';
  giraRenderPlayerSel(ev.player_ids || []);
  giraRenderCoachSel(ev.coach_ids || []);
  document.getElementById('gira-modal').style.display = 'flex';
}

function giraCloseModal() {
  document.getElementById('gira-modal').style.display = 'none';
}

function giraRenderPlayerSel(selected) {
  const el = document.getElementById('gira-player-sel');
  if (!el) return;
  el.innerHTML = giraPlayers.map(p => {
    const checked = selected.includes(p.id);
    return `<label style="display:flex;align-items:center;gap:8px;padding:7px 10px;border:1px solid ${checked?'#FF6B00':'#eee'};border-radius:8px;cursor:pointer;background:${checked?'#fff5f0':'#fff'}">
      <input type="checkbox" value="${p.id}" ${checked?'checked':''} onchange="giraTogglePlayer(this)" style="accent-color:#FF6B00">
      <span style="font-size:13px">${p.full_name}</span>
    </label>`;
  }).join('') || '<div style="color:#aaa;font-size:13px">Sin jugadores</div>';
}

function giraTogglePlayer(cb) {
  const l = cb.closest('label');
  l.style.border = cb.checked ? '1px solid #FF6B00' : '1px solid #eee';
  l.style.background = cb.checked ? '#fff5f0' : '#fff';
}

function giraRenderCoachSel(selected) {
  const el = document.getElementById('gira-coach-sel');
  if (!el) return;
  el.innerHTML = giraCoaches.map(c => {
    const checked = selected.includes(c.id);
    return `<label style="display:flex;align-items:center;gap:8px;padding:7px 10px;border:1px solid ${checked?'#1DA1D6':'#eee'};border-radius:8px;cursor:pointer;background:${checked?'#f0faff':'#fff'}">
      <input type="checkbox" value="${c.id}" ${checked?'checked':''} onchange="giraToggleCoach(this)" style="accent-color:#1DA1D6">
      <span style="font-size:13px">${c.name}</span>
    </label>`;
  }).join('') || '<div style="color:#aaa;font-size:13px">Sin entrenadores</div>';
}

function giraToggleCoach(cb) {
  const l = cb.closest('label');
  l.style.border = cb.checked ? '1px solid #1DA1D6' : '1px solid #eee';
  l.style.background = cb.checked ? '#f0faff' : '#fff';
}

async function giraSaveEvent() {
  const city = document.getElementById('gira-city').value.trim();
  const country = document.getElementById('gira-country').value.trim();
  if (!city || !country) { alert('Ciudad y país son requeridos'); return; }
  const player_ids = Array.from(document.querySelectorAll('#gira-player-sel input:checked')).map(cb => cb.value);
  const coach_ids = Array.from(document.querySelectorAll('#gira-coach-sel input:checked')).map(cb => cb.value);
  const group_sel = document.getElementById('gira-group-sel').value;
  const body = {
    week: document.getElementById('gira-week').value,
    city, country,
    level: document.getElementById('gira-level').value,
    surface: document.getElementById('gira-surface').value,
    group_id: group_sel === 'all' ? null : group_sel,
    player_ids, coach_ids
  };
  const editId = document.getElementById('gira-edit-id').value;
  try {
    if (editId) {
      await apiFetch(`/api/v1/gira/${editId}`, { method: 'PUT', body: JSON.stringify(body) });
    } else {
      await apiFetch('/api/v1/gira', { method: 'POST', body: JSON.stringify(body) });
    }
    giraCloseModal();
    await giraLoadData();
  } catch(e) { alert('Error al guardar'); }
}

async function giraDeleteEvent(id) {
  if (!confirm('¿Eliminar este evento?')) return;
  try {
    await apiFetch(`/api/v1/gira/${id}`, { method: 'DELETE' });
    await giraLoadData();
  } catch(e) { alert('Error al eliminar'); }
}
