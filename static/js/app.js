/* ====================================================
   Dashboard Doanh Thu — app.js
   Frontend logic: tabs, month nav, CRUD, KPI, live preview
   ==================================================== */

// ── State ───────────────────────────────────────────
const state = {
  activeTab: 'nha_hang',    // 'nha_hang' | 'thuoc'
  year:  new Date().getFullYear(),
  month: new Date().getMonth() + 1,
  data:  { nha_hang: [], thuoc: [] },
  selectedDay: null,
  pendingDelete: null,      // { type, ngay }
};

// ── DOM refs ─────────────────────────────────────────
const $ = id => document.getElementById(id);
const monthDisplay  = $('monthDisplay');
const tabNhaHang    = $('tabNhaHang');
const tabThuoc      = $('tabThuoc');
const formNhaHang   = $('formNhaHang');
const formThuoc     = $('formThuoc');
const formTitle     = $('formTitle');
const tableTitle    = $('tableTitle');
const tableNhaHang  = $('tableNhaHang');
const tableThuoc    = $('tableThuoc');
const daySelector   = $('daySelector');
const modalDelete   = $('modalDelete');
const modalDeleteMsg = $('modalDeleteMsg');

// ── Formatting ───────────────────────────────────────
function fmt(n) {
  if (!n && n !== 0) return '—';
  return Number(n).toLocaleString('vi-VN') + ' đ';
}
function fmtShort(n) {
  if (!n && n !== 0) return '—';
  const v = Number(n);
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + 'M đ';
  if (v >= 1_000)     return (v / 1_000).toFixed(0)     + 'k đ';
  return v + ' đ';
}
function monthKey() {
  return `${state.year}-${String(state.month).padStart(2,'0')}`;
}
function daysInMonth() {
  return new Date(state.year, state.month, 0).getDate();
}

// ── Toast ────────────────────────────────────────────
function toast(msg, type='success') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = type === 'success' ? '✅ ' + msg : '❌ ' + msg;
  $('toastContainer').prepend(el);
  setTimeout(() => el.remove(), 3000);
}

// ── API calls ────────────────────────────────────────
async function apiGet(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
async function apiPost(url, body) {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const json = await r.json();
  if (!r.ok) throw new Error(json.error || 'Lỗi server');
  return json;
}
async function apiDelete(url) {
  const r = await fetch(url, { method: 'DELETE' });
  const json = await r.json();
  if (!r.ok) throw new Error(json.error || 'Lỗi server');
  return json;
}

// ── Load month data ──────────────────────────────────
async function loadMonth() {
  try {
    state.data = await apiGet(`/api/records/${monthKey()}`);
    renderAll();
    await loadKpi();
  } catch(e) {
    toast('Lỗi tải dữ liệu: ' + e.message, 'error');
  }
}

async function loadKpi() {
  try {
    const s = await apiGet(`/api/summary/${monthKey()}`);
    const nh = s.nha_hang, th = s.thuoc;
    const total = nh.tong_thang + th.tong_thang;
    const totalDays = nh.so_ngay + th.so_ngay;

    $('kpiNhTong').textContent = fmtShort(nh.tong_thang);
    $('kpiNhSub').textContent  = `${nh.so_ngay} ngày • TB: ${fmtShort(nh.tb_ngay)}`;
    $('kpiThTong').textContent = fmtShort(th.tong_thang);
    $('kpiThSub').textContent  = `${th.so_ngay} ngày • TB: ${fmtShort(th.tb_ngay)}`;
    $('kpiAllTong').textContent = fmtShort(total);
    $('kpiAllSub').textContent  = `TB ngày: ${fmtShort(totalDays ? Math.round(total / Math.max(nh.so_ngay, th.so_ngay, 1)) : 0)}`;
  } catch(e) { /* silent */ }
}

// ── Month navigation ─────────────────────────────────
function updateMonthDisplay() {
  monthDisplay.textContent = `Tháng ${state.month} / ${state.year}`;
}
$('btnPrevMonth').addEventListener('click', () => {
  if (--state.month < 1) { state.month = 12; state.year--; }
  state.selectedDay = null;
  updateMonthDisplay();
  loadMonth();
});
$('btnNextMonth').addEventListener('click', () => {
  if (++state.month > 12) { state.month = 1; state.year++; }
  state.selectedDay = null;
  updateMonthDisplay();
  loadMonth();
});

// ── Tab switching ────────────────────────────────────
function switchTab(tab) {
  state.activeTab = tab;
  state.selectedDay = null;

  const isNh = tab === 'nha_hang';

  tabNhaHang.className = 'tab-btn' + (isNh ? ' active-nh' : '');
  tabThuoc.className   = 'tab-btn' + (!isNh ? ' active-th' : '');

  formNhaHang.classList.toggle('hidden', !isNh);
  formThuoc.classList.toggle('hidden',    isNh);
  tableNhaHang.classList.toggle('hidden', !isNh);
  tableThuoc.classList.toggle('hidden',    isNh);

  formTitle.textContent  = isNh ? '📝 Nhập liệu — Nhà Hàng' : '📝 Nhập liệu — Thuốc';
  tableTitle.textContent = isNh ? '📋 Tổng hợp tháng — Nhà Hàng' : '📋 Tổng hợp tháng — Thuốc';

  clearInputs();
  renderDaySelector();
}
tabNhaHang.addEventListener('click', () => switchTab('nha_hang'));
tabThuoc.addEventListener('click',   () => switchTab('thuoc'));

// ── Day selector ─────────────────────────────────────
function renderDaySelector() {
  const total = daysInMonth();
  const isNh  = state.activeTab === 'nha_hang';
  const existing = new Set((isNh ? state.data.nha_hang : state.data.thuoc).map(r => r.ngay));
  const colorClass = isNh ? 'has-data-nh' : 'has-data-th';
  const selClass   = isNh ? 'selected-nh' : 'selected-th';

  daySelector.innerHTML = '';
  for (let d = 1; d <= total; d++) {
    const ngay = `${d}.${state.month}`;
    const pill = document.createElement('button');
    pill.className = 'day-pill';
    pill.textContent = d;
    pill.dataset.ngay = ngay;
    if (existing.has(ngay)) pill.classList.add(colorClass);
    if (ngay === state.selectedDay) pill.classList.add(selClass);
    pill.addEventListener('click', () => selectDay(ngay, pill));
    daySelector.appendChild(pill);
  }
}

function selectDay(ngay, pill) {
  state.selectedDay = ngay;
  // Update pill UI
  document.querySelectorAll('.day-pill').forEach(p => {
    p.classList.remove('selected-nh', 'selected-th');
  });
  const selClass = state.activeTab === 'nha_hang' ? 'selected-nh' : 'selected-th';
  pill.classList.add(selClass);
  loadDayIntoForm(ngay);
}

function loadDayIntoForm(ngay) {
  const isNh = state.activeTab === 'nha_hang';
  const recs  = isNh ? state.data.nha_hang : state.data.thuoc;
  const rec   = recs.find(r => r.ngay === ngay);
  clearInputs();
  if (!rec) return;

  if (isNh) {
    $('inp_sang').value          = rec.sang          || '';
    $('inp_toi').value           = rec.toi           || '';
    $('inp_tien_ck').value       = rec.tien_ck       || '';
    $('inp_tien_ck_thuoc').value = rec.tien_ck_thuoc || '';
    $('inp_tien_ck_dungcu').value= rec.tien_ck_dungcu|| '';
    $('inp_tien_tra_hang').value = rec.tien_tra_hang || '';
    updatePreviewNh();
  } else {
    $('inp_ca1').value      = rec.ca1      || '';
    $('inp_ca2').value      = rec.ca2      || '';
    $('inp_ca3').value      = rec.ca3      || '';
    $('inp_ca4').value      = rec.ca4      || '';
    $('inp_ck').value       = rec.ck       || '';
    $('inp_tra_them').value = rec.tra_them || '';
    updatePreviewTh();
  }
}

function clearInputs() {
  ['inp_sang','inp_toi','inp_tien_ck','inp_tien_ck_thuoc',
   'inp_tien_ck_dungcu','inp_tien_tra_hang',
   'inp_ca1','inp_ca2','inp_ca3','inp_ca4','inp_ck','inp_tra_them']
    .forEach(id => { const el = $(id); if(el) el.value = ''; });
  $('previewTongNh').textContent = '0 đ';
  $('previewTongTh').textContent = '0 đ';
}

// ── Live preview ─────────────────────────────────────
function getNum(id) { return parseInt($(id)?.value || '0') || 0; }

function updatePreviewNh() {
  const t = getNum('inp_sang') + getNum('inp_toi') + getNum('inp_tien_ck')
          + getNum('inp_tien_ck_thuoc') + getNum('inp_tien_ck_dungcu');
  $('previewTongNh').textContent = fmt(t);
}
function updatePreviewTh() {
  const t = getNum('inp_ca1') + getNum('inp_ca2') + getNum('inp_ca3')
          + getNum('inp_ca4') + getNum('inp_ck');
  $('previewTongTh').textContent = fmt(t);
}

['inp_sang','inp_toi','inp_tien_ck','inp_tien_ck_thuoc','inp_tien_ck_dungcu']
  .forEach(id => document.addEventListener('DOMContentLoaded', () => {
    $(id)?.addEventListener('input', updatePreviewNh);
  }));
['inp_ca1','inp_ca2','inp_ca3','inp_ca4','inp_ck']
  .forEach(id => document.addEventListener('DOMContentLoaded', () => {
    $(id)?.addEventListener('input', updatePreviewTh);
  }));

// ── Save handlers ─────────────────────────────────────
async function saveNh() {
  if (!state.selectedDay) { toast('Vui lòng chọn ngày', 'error'); return; }
  const body = {
    ngay:           state.selectedDay,
    sang:           getNum('inp_sang'),
    toi:            getNum('inp_toi'),
    tien_ck:        getNum('inp_tien_ck'),
    tien_ck_thuoc:  getNum('inp_tien_ck_thuoc'),
    tien_ck_dungcu: getNum('inp_tien_ck_dungcu'),
    tien_tra_hang:  getNum('inp_tien_tra_hang'),
  };
  try {
    await apiPost(`/api/records/${monthKey()}/nha_hang`, body);
    toast('Đã lưu ngày ' + state.selectedDay);
    await loadMonth();
  } catch(e) { toast(e.message, 'error'); }
}

async function saveTh() {
  if (!state.selectedDay) { toast('Vui lòng chọn ngày', 'error'); return; }
  const body = {
    ngay:     state.selectedDay,
    ca1:      getNum('inp_ca1'),
    ca2:      getNum('inp_ca2'),
    ca3:      getNum('inp_ca3'),
    ca4:      getNum('inp_ca4'),
    ck:       getNum('inp_ck'),
    tra_them: getNum('inp_tra_them'),
  };
  try {
    await apiPost(`/api/records/${monthKey()}/thuoc`, body);
    toast('Đã lưu ngày ' + state.selectedDay);
    await loadMonth();
  } catch(e) { toast(e.message, 'error'); }
}

$('btnSaveNh').addEventListener('click', saveNh);
$('btnSaveTh').addEventListener('click', saveTh);

// ── Delete ────────────────────────────────────────────
function confirmDelete(type, ngay) {
  state.pendingDelete = { type, ngay };
  modalDeleteMsg.textContent = `Xóa dữ liệu ngày ${ngay} (${type === 'nha_hang' ? 'Nhà Hàng' : 'Thuốc'})?`;
  modalDelete.classList.remove('hidden');
}

$('btnCloseModal').addEventListener('click',  () => modalDelete.classList.add('hidden'));
$('btnCancelDelete').addEventListener('click', () => modalDelete.classList.add('hidden'));
$('btnConfirmDelete').addEventListener('click', async () => {
  if (!state.pendingDelete) return;
  const { type, ngay } = state.pendingDelete;
  modalDelete.classList.add('hidden');
  try {
    await apiDelete(`/api/records/${monthKey()}/${type}/${encodeURIComponent(ngay)}`);
    toast('Đã xóa ngày ' + ngay);
    state.pendingDelete = null;
    if (state.selectedDay === ngay) { state.selectedDay = null; clearInputs(); }
    await loadMonth();
  } catch(e) { toast(e.message, 'error'); }
});

// ── Render tables ─────────────────────────────────────
function renderAll() {
  renderTableNh();
  renderTableTh();
  renderDaySelector();
}

function renderTableNh() {
  const recs = state.data.nha_hang || [];
  const body = $('bodyNh');
  const foot = $('footNh');

  if (!recs.length) {
    body.innerHTML = `<tr><td colspan="9"><div class="empty-state"><span class="icon">🏠</span><p>Chưa có dữ liệu tháng này</p></div></td></tr>`;
    foot.innerHTML = '';
    return;
  }

  body.innerHTML = recs.map(r => `
    <tr>
      <td><strong>${r.ngay}</strong></td>
      <td>${fmtNum(r.sang)}</td>
      <td>${fmtNum(r.toi)}</td>
      <td>${fmtNum(r.tien_ck)}</td>
      <td>${fmtNum(r.tien_ck_thuoc)}</td>
      <td>${fmtNum(r.tien_ck_dungcu)}</td>
      <td>${fmtNum(r.tien_tra_hang)}</td>
      <td class="col-tong col-tong-nh">${fmtNum(r.tong)}</td>
      <td>
        <div class="actions-col">
          <button class="btn btn-outline btn-sm" onclick="editNh('${r.ngay}')">✏️</button>
          <button class="btn btn-danger  btn-sm" onclick="confirmDelete('nha_hang','${r.ngay}')">🗑</button>
        </div>
      </td>
    </tr>`).join('');

  const sumTong = recs.reduce((s,r) => s + (r.tong||0), 0);
  const sumSang = recs.reduce((s,r) => s + (r.sang||0), 0);
  const sumToi  = recs.reduce((s,r) => s + (r.toi ||0), 0);
  const sumCk   = recs.reduce((s,r) => s + (r.tien_ck||0), 0);
  const sumCkTh = recs.reduce((s,r) => s + (r.tien_ck_thuoc||0), 0);
  const sumCkDC = recs.reduce((s,r) => s + (r.tien_ck_dungcu||0), 0);
  const sumTra  = recs.reduce((s,r) => s + (r.tien_tra_hang||0), 0);

  foot.innerHTML = `
    <tr class="row-total">
      <td><strong>TỔNG (${recs.length} ngày)</strong></td>
      <td>${fmtNum(sumSang)}</td>
      <td>${fmtNum(sumToi)}</td>
      <td>${fmtNum(sumCk)}</td>
      <td>${fmtNum(sumCkTh)}</td>
      <td>${fmtNum(sumCkDC)}</td>
      <td>${fmtNum(sumTra)}</td>
      <td class="col-tong col-tong-nh">${fmtNum(sumTong)}</td>
      <td></td>
    </tr>`;
}

function renderTableTh() {
  const recs = state.data.thuoc || [];
  const body = $('bodyTh');
  const foot = $('footTh');

  if (!recs.length) {
    body.innerHTML = `<tr><td colspan="9"><div class="empty-state"><span class="icon">💊</span><p>Chưa có dữ liệu tháng này</p></div></td></tr>`;
    foot.innerHTML = '';
    return;
  }

  body.innerHTML = recs.map(r => `
    <tr>
      <td><strong>${r.ngay}</strong></td>
      <td>${fmtNum(r.ca1)}</td>
      <td>${fmtNum(r.ca2)}</td>
      <td>${fmtNum(r.ca3)}</td>
      <td>${fmtNum(r.ca4)}</td>
      <td>${fmtNum(r.ck)}</td>
      <td>${fmtNum(r.tra_them)}</td>
      <td class="col-tong col-tong-th">${fmtNum(r.tong)}</td>
      <td>
        <div class="actions-col">
          <button class="btn btn-outline btn-sm" onclick="editTh('${r.ngay}')">✏️</button>
          <button class="btn btn-danger  btn-sm" onclick="confirmDelete('thuoc','${r.ngay}')">🗑</button>
        </div>
      </td>
    </tr>`).join('');

  const sumTong = recs.reduce((s,r) => s + (r.tong||0), 0);
  const sum = (k) => recs.reduce((s,r) => s + (r[k]||0), 0);

  foot.innerHTML = `
    <tr class="row-total">
      <td><strong>TỔNG (${recs.length} ngày)</strong></td>
      <td>${fmtNum(sum('ca1'))}</td>
      <td>${fmtNum(sum('ca2'))}</td>
      <td>${fmtNum(sum('ca3'))}</td>
      <td>${fmtNum(sum('ca4'))}</td>
      <td>${fmtNum(sum('ck'))}</td>
      <td>${fmtNum(sum('tra_them'))}</td>
      <td class="col-tong col-tong-th">${fmtNum(sumTong)}</td>
      <td></td>
    </tr>`;
}

function fmtNum(n) {
  if (!n) return '<span class="text-muted">—</span>';
  return Number(n).toLocaleString('vi-VN');
}

// ── Edit shortcuts ────────────────────────────────────
function editNh(ngay) {
  if (state.activeTab !== 'nha_hang') switchTab('nha_hang');
  state.selectedDay = ngay;
  renderDaySelector();
  loadDayIntoForm(ngay);
  $('formCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function editTh(ngay) {
  if (state.activeTab !== 'thuoc') switchTab('thuoc');
  state.selectedDay = ngay;
  renderDaySelector();
  loadDayIntoForm(ngay);
  $('formCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
window.editNh = editNh;
window.editTh = editTh;
window.confirmDelete = confirmDelete;

// ── Export ────────────────────────────────────────────
$('btnExport').addEventListener('click', () => {
  window.location.href = `/api/export/${monthKey()}`;
});

// ── Live preview wiring (after DOM ready) ────────────
document.addEventListener('DOMContentLoaded', () => {
  ['inp_sang','inp_toi','inp_tien_ck','inp_tien_ck_thuoc','inp_tien_ck_dungcu']
    .forEach(id => $(id)?.addEventListener('input', updatePreviewNh));
  ['inp_ca1','inp_ca2','inp_ca3','inp_ca4','inp_ck']
    .forEach(id => $(id)?.addEventListener('input', updatePreviewTh));
});

// ── Init ─────────────────────────────────────────────
updateMonthDisplay();
loadMonth();
