/* ====================================================
   Dashboard Doanh Thu — app.js
   Frontend logic: tabs, month nav, CRUD, KPI, live preview
   ==================================================== */

// ── State ───────────────────────────────────────────
const state = {
  activeTab: 'quay_thuoc',    // 'quay_thuoc' | 'thuoc'
  year:  new Date().getFullYear(),
  month: new Date().getMonth() + 1,
  data:  { quay_thuoc: [], thuoc: [] },
  selectedDay: null,
  pendingDelete: null,      // { type, ngay }
  drafts: { quay_thuoc: {}, thuoc: {} }
};

// ── DOM refs ─────────────────────────────────────────
const $ = id => document.getElementById(id);
const monthDisplay  = $('monthDisplay');
const tabQuayThuoc    = $('tabQuayThuoc');
const tabThuoc      = $('tabThuoc');
const formQuayThuoc   = $('formQuayThuoc');
const formThuoc     = $('formThuoc');
const formTitle     = $('formTitle');
const tableTitle    = $('tableTitle');
const tableQuayThuoc  = $('tableQuayThuoc');
const tableThuoc    = $('tableThuoc');
const daySelector   = $('daySelector');
const modalDelete   = $('modalDelete');
const modalDeleteMsg = $('modalDeleteMsg');

// ── Formatting ───────────────────────────────────────
function fmt(n) {
  if (!n && n !== 0) return '—';
  return Number(n).toLocaleString('vi-VN') + ' đ';
}
function formatInputNumber(n) {
  if (!n && n !== 0) return '';
  return Number(n).toLocaleString('vi-VN');
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
function saveCurrentFormToDraft() {
  if (!state.selectedDay) return;
  const isNh = state.activeTab === 'quay_thuoc';
  const tab = isNh ? 'quay_thuoc' : 'thuoc';
  const dbRec = state.data[tab].find(r => r.ngay === state.selectedDay) || {};
  
  if (isNh) {
    const current = {
      sang:           getNum('inp_sang'),
      toi:            getNum('inp_toi'),
      tien_ck:        getNum('inp_tien_ck'),
      tien_ck_thuoc:  getNum('inp_tien_ck_thuoc'),
      tien_ck_dungcu: getNum('inp_tien_ck_dungcu'),
      tien_tra_hang:  getNum('inp_tien_tra_hang'),
    };
    const hasDiff = current.sang !== (dbRec.sang || 0) ||
                    current.toi !== (dbRec.toi || 0) ||
                    current.tien_ck !== (dbRec.tien_ck || 0) ||
                    current.tien_ck_thuoc !== (dbRec.tien_ck_thuoc || 0) ||
                    current.tien_ck_dungcu !== (dbRec.tien_ck_dungcu || 0) ||
                    current.tien_tra_hang !== (dbRec.tien_tra_hang || 0);
    const isFormEmpty = !current.sang && !current.toi && !current.tien_ck && !current.tien_ck_thuoc && !current.tien_ck_dungcu && !current.tien_tra_hang;
    if (hasDiff && !(isFormEmpty && !dbRec.ngay)) {
      state.drafts.quay_thuoc[state.selectedDay] = current;
    } else {
      delete state.drafts.quay_thuoc[state.selectedDay];
    }
  } else {
    const current = {
      ca1:      getNum('inp_ca1'),
      ca2:      getNum('inp_ca2'),
      ca3:      getNum('inp_ca3'),
      ca4:      getNum('inp_ca4'),
      ck:       getNum('inp_ck'),
      tra_them: getNum('inp_tra_them'),
    };
    const hasDiff = current.ca1 !== (dbRec.ca1 || 0) ||
                    current.ca2 !== (dbRec.ca2 || 0) ||
                    current.ca3 !== (dbRec.ca3 || 0) ||
                    current.ca4 !== (dbRec.ca4 || 0) ||
                    current.ck !== (dbRec.ck || 0) ||
                    current.tra_them !== (dbRec.tra_them || 0);
    const isFormEmpty = !current.ca1 && !current.ca2 && !current.ca3 && !current.ca4 && !current.ck && !current.tra_them;
    if (hasDiff && !(isFormEmpty && !dbRec.ngay)) {
      state.drafts.thuoc[state.selectedDay] = current;
    } else {
      delete state.drafts.thuoc[state.selectedDay];
    }
  }
}
function updateDraftIndicator() {
  saveCurrentFormToDraft();
  if (state.selectedDay) {
    const pill = document.querySelector(`.day-pill[data-ngay="${state.selectedDay}"]`);
    if (pill) {
      const tab = state.activeTab;
      const hasDraft = !!state.drafts[tab][state.selectedDay];
      pill.classList.toggle('has-draft', hasDraft);
    }
  }
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
    const nh = s.quay_thuoc, th = s.thuoc;
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
  saveCurrentFormToDraft();
  state.drafts = { quay_thuoc: {}, thuoc: {} };
  if (--state.month < 1) { state.month = 12; state.year--; }
  state.selectedDay = null;
  updateMonthDisplay();
  loadMonth();
});
$('btnNextMonth').addEventListener('click', () => {
  saveCurrentFormToDraft();
  state.drafts = { quay_thuoc: {}, thuoc: {} };
  if (++state.month > 12) { state.month = 1; state.year++; }
  state.selectedDay = null;
  updateMonthDisplay();
  loadMonth();
});

// ── Tab switching ────────────────────────────────────
function switchTab(tab) {
  saveCurrentFormToDraft();
  state.activeTab = tab;
  state.selectedDay = null;

  const isNh = tab === 'quay_thuoc';

  tabQuayThuoc.className = 'tab-btn' + (isNh ? ' active-nh' : '');
  tabThuoc.className   = 'tab-btn' + (!isNh ? ' active-th' : '');

  formQuayThuoc.classList.toggle('hidden', !isNh);
  formThuoc.classList.toggle('hidden',    isNh);
  tableQuayThuoc.classList.toggle('hidden', !isNh);
  tableThuoc.classList.toggle('hidden',    isNh);

  formTitle.textContent  = '📝 Nhập liệu — Quầy Thuốc';
  tableTitle.textContent = '📋 Tổng hợp tháng — Quầy Thuốc';

  clearInputs();
  renderDaySelector();
}
tabQuayThuoc.addEventListener('click', () => switchTab('quay_thuoc'));
tabThuoc.addEventListener('click',   () => switchTab('thuoc'));

// ── Day selector ─────────────────────────────────────
function renderDaySelector() {
  const total = daysInMonth();
  const isNh  = state.activeTab === 'quay_thuoc';
  const existing = new Set((isNh ? state.data.quay_thuoc : state.data.thuoc).map(r => r.ngay));
  const colorClass = isNh ? 'has-data-nh' : 'has-data-th';
  const selClass   = isNh ? 'selected-nh' : 'selected-th';

  daySelector.innerHTML = '';
  const tab = state.activeTab;
  for (let d = 1; d <= total; d++) {
    const ngay = `${d}.${state.month}`;
    const pill = document.createElement('button');
    pill.className = 'day-pill';
    pill.textContent = d;
    pill.dataset.ngay = ngay;
    if (existing.has(ngay)) pill.classList.add(colorClass);
    if (ngay === state.selectedDay) pill.classList.add(selClass);
    if (state.drafts[tab][ngay]) pill.classList.add('has-draft');
    pill.addEventListener('click', () => selectDay(ngay, pill));
    daySelector.appendChild(pill);
  }
}

function selectDay(ngay, pill) {
  saveCurrentFormToDraft();
  state.selectedDay = ngay;
  // Update pill UI
  document.querySelectorAll('.day-pill').forEach(p => {
    p.classList.remove('selected-nh', 'selected-th');
  });
  const selClass = state.activeTab === 'quay_thuoc' ? 'selected-nh' : 'selected-th';
  pill.classList.add(selClass);
  loadDayIntoForm(ngay);
  renderDaySelector();
}

function loadDayIntoForm(ngay) {
  const isNh = state.activeTab === 'quay_thuoc';
  const tab = isNh ? 'quay_thuoc' : 'thuoc';
  const draft = state.drafts[tab][ngay];
  clearInputs();
  
  if (draft) {
    if (isNh) {
      $('inp_sang').value          = formatInputNumber(draft.sang);
      $('inp_toi').value           = formatInputNumber(draft.toi);
      $('inp_tien_ck').value       = formatInputNumber(draft.tien_ck);
      $('inp_tien_ck_thuoc').value = formatInputNumber(draft.tien_ck_thuoc);
      $('inp_tien_ck_dungcu').value= formatInputNumber(draft.tien_ck_dungcu);
      $('inp_tien_tra_hang').value = formatInputNumber(draft.tien_tra_hang);
      updatePreviewNh();
    } else {
      $('inp_ca1').value      = formatInputNumber(draft.ca1);
      $('inp_ca2').value      = formatInputNumber(draft.ca2);
      $('inp_ca3').value      = formatInputNumber(draft.ca3);
      $('inp_ca4').value      = formatInputNumber(draft.ca4);
      $('inp_ck').value       = formatInputNumber(draft.ck);
      $('inp_tra_them').value = formatInputNumber(draft.tra_them);
      updatePreviewTh();
    }
    return;
  }
  
  const recs  = isNh ? state.data.quay_thuoc : state.data.thuoc;
  const rec   = recs.find(r => r.ngay === ngay);
  if (!rec) return;

  if (isNh) {
    $('inp_sang').value          = formatInputNumber(rec.sang);
    $('inp_toi').value           = formatInputNumber(rec.toi);
    $('inp_tien_ck').value       = formatInputNumber(rec.tien_ck);
    $('inp_tien_ck_thuoc').value = formatInputNumber(rec.tien_ck_thuoc);
    $('inp_tien_ck_dungcu').value= formatInputNumber(rec.tien_ck_dungcu);
    $('inp_tien_tra_hang').value = formatInputNumber(rec.tien_tra_hang);
    updatePreviewNh();
  } else {
    $('inp_ca1').value      = formatInputNumber(rec.ca1);
    $('inp_ca2').value      = formatInputNumber(rec.ca2);
    $('inp_ca3').value      = formatInputNumber(rec.ca3);
    $('inp_ca4').value      = formatInputNumber(rec.ca4);
    $('inp_ck').value       = formatInputNumber(rec.ck);
    $('inp_tra_them').value = formatInputNumber(rec.tra_them);
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
function getNum(id) {
  const val = $(id)?.value || '';
  const cleanVal = val.replace(/\./g, '').replace(/,/g, '').trim();
  return parseInt(cleanVal, 10) || 0;
}

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

// ── Live preview wiring (handled at the bottom of the file) ────

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
    await apiPost(`/api/records/${monthKey()}/quay_thuoc`, body);
    toast('Đã lưu ngày ' + state.selectedDay);
    delete state.drafts.quay_thuoc[state.selectedDay];
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
    delete state.drafts.thuoc[state.selectedDay];
    await loadMonth();
  } catch(e) { toast(e.message, 'error'); }
}

$('btnSaveNh').addEventListener('click', saveNh);
$('btnSaveTh').addEventListener('click', saveTh);

// ── Delete ────────────────────────────────────────────
function confirmDelete(type, ngay) {
  state.pendingDelete = { type, ngay };
  modalDeleteMsg.textContent = `Xóa dữ liệu ngày ${ngay} (Quầy Thuốc)?`;
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
    delete state.drafts[type][ngay];
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
  const recs = state.data.quay_thuoc || [];
  const body = $('bodyNh');
  const foot = $('footNh');

  if (!recs.length) {
    body.innerHTML = `<tr><td colspan="9"><div class="empty-state"><span class="icon">💊</span><p>Chưa có dữ liệu tháng này</p></div></td></tr>`;
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
          <button class="btn btn-danger  btn-sm" onclick="confirmDelete('quay_thuoc','${r.ngay}')">🗑</button>
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
  if (state.activeTab !== 'quay_thuoc') switchTab('quay_thuoc');
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

function formatInputOnType(e) {
  const input = e.target;
  let rawVal = input.value.replace(/\D/g, '');
  
  if (rawVal === '') {
    input.value = '';
    return;
  }
  
  // Lấy phần số thực tế trước 3 số 0 cuối cùng (nếu có)
  let cleanNumberStr = rawVal;
  if (rawVal.length > 3 && rawVal.endsWith('000')) {
    cleanNumberStr = rawVal.slice(0, -3);
  }
  
  // Nếu phần số thực tế chỉ gồm số 0 hoặc trống, xóa sạch input
  if (cleanNumberStr === '' || /^0+$/.test(cleanNumberStr)) {
    input.value = '';
    return;
  }
  
  // Tự động thêm 3 số 0 vào sau
  let finalValueStr = cleanNumberStr + '000';
  let formatted = Number(finalValueStr).toLocaleString('vi-VN');
  input.value = formatted;
  
  // Đặt con trỏ chuột luôn ở trước 3 số 0 cuối cùng (.000 chiếm 4 ký tự cuối)
  let cursorPosition = formatted.length - 4;
  if (cursorPosition < 0) cursorPosition = 0;
  
  input.setSelectionRange(cursorPosition, cursorPosition);
}

// ── Live preview wiring (after DOM ready) ────────────
document.addEventListener('DOMContentLoaded', () => {
  const nhInputs = ['inp_sang','inp_toi','inp_tien_ck','inp_tien_ck_thuoc','inp_tien_ck_dungcu','inp_tien_tra_hang'];
  const thInputs = ['inp_ca1','inp_ca2','inp_ca3','inp_ca4','inp_ck','inp_tra_them'];
  
  nhInputs.forEach(id => {
    const el = $(id);
    if (el) {
      el.addEventListener('input', formatInputOnType);
      el.addEventListener('input', updatePreviewNh);
      el.addEventListener('input', updateDraftIndicator);
    }
  });
  
  thInputs.forEach(id => {
    const el = $(id);
    if (el) {
      el.addEventListener('input', formatInputOnType);
      el.addEventListener('input', updatePreviewTh);
      el.addEventListener('input', updateDraftIndicator);
    }
  });
});

// ── Init ─────────────────────────────────────────────
updateMonthDisplay();
loadMonth();
