/* ====================================================
   Dashboard Doanh Thu - app.js
   Tabs, month nav, CRUD, KPI, mobile/desktop view switch
   ==================================================== */

const state = {
  activeTab: 'quay_thuoc',
  viewMode: 'desktop',
  year: new Date().getFullYear(),
  month: new Date().getMonth() + 1,
  data: { quay_thuoc: [], thuoc: [] },
  selectedDay: null,
  pendingDelete: null,
  drafts: { quay_thuoc: {}, thuoc: {} }
};

const VIEW_KEY = 'doanhthu.viewMode';
const $ = id => document.getElementById(id);

const el = {
  monthDisplay: $('monthDisplay'),
  tabNav: $('tabNav'),
  tabQuayThuoc: $('tabQuayThuoc'),
  tabThuoc: $('tabThuoc'),
  formQuayThuoc: $('formQuayThuoc'),
  formThuoc: $('formThuoc'),
  formTitle: $('formTitle'),
  tableTitle: $('tableTitle'),
  mobileRecordsTitle: $('mobileRecordsTitle'),
  mobileRecordsSub: $('mobileRecordsSub'),
  tableQuayThuoc: $('tableQuayThuoc'),
  tableThuoc: $('tableThuoc'),
  mobileRecords: $('mobileRecords'),
  mobileRecordsList: $('mobileRecordsList'),
  daySelector: $('daySelector'),
  modalDelete: $('modalDelete'),
  modalDeleteMsg: $('modalDeleteMsg'),
  btnViewDesktop: $('btnViewDesktop'),
  btnViewMobile: $('btnViewMobile'),
  btnExport: $('btnExport'),
  btnPrevMonth: $('btnPrevMonth'),
  btnNextMonth: $('btnNextMonth'),
  btnSaveNh: $('btnSaveNh'),
  btnSaveTh: $('btnSaveTh')
};

const TAB_META = {
  quay_thuoc: {
    label: 'Quầy Thuốc',
    tabButton: 'Quầy Thuốc',
    formTitle: 'Nhập liệu - Quầy Thuốc',
    tableTitle: 'Tổng hợp tháng - Quầy Thuốc',
    mobileTitle: 'Danh sách ngày - Quầy Thuốc',
    emptyIcon: '🏠',
    mobileTotalClass: ''
  },
  thuoc: {
    label: 'Thuốc',
    tabButton: 'Thuốc',
    formTitle: 'Nhập liệu - Thuốc',
    tableTitle: 'Tổng hợp tháng - Thuốc',
    mobileTitle: 'Danh sách ngày - Thuốc',
    emptyIcon: '💊',
    mobileTotalClass: 'th'
  }
};

function fmt(n) {
  if (n === null || n === undefined || n === '') return '—';
  return Number(n).toLocaleString('vi-VN') + ' đ';
}

function fmtShort(n) {
  if (!n && n !== 0) return '—';
  const v = Number(n);
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + 'M đ';
  if (v >= 1_000) return (v / 1_000).toFixed(0) + 'k đ';
  return v + ' đ';
}

function formatInputNumber(n) {
  if (n === null || n === undefined || n === '') return '';
  return Number(n).toLocaleString('vi-VN');
}

function monthKey() {
  return `${state.year}-${String(state.month).padStart(2, '0')}`;
}

function daysInMonth() {
  return new Date(state.year, state.month, 0).getDate();
}

function getTabMeta(tab = state.activeTab) {
  return TAB_META[tab] || TAB_META.quay_thuoc;
}

function saveViewMode(mode) {
  state.viewMode = mode;
  document.body.dataset.view = mode;
  localStorage.setItem(VIEW_KEY, mode);
  el.btnViewDesktop?.classList.toggle('active', mode === 'desktop');
  el.btnViewMobile?.classList.toggle('active', mode === 'mobile');
}

function getInitialViewMode() {
  const stored = localStorage.getItem(VIEW_KEY);
  if (stored === 'desktop' || stored === 'mobile') return stored;
  return window.innerWidth < 980 ? 'mobile' : 'desktop';
}

function getNum(id) {
  const value = $(id)?.value || '';
  const cleaned = value.replace(/\./g, '').replace(/,/g, '').trim();
  return parseInt(cleaned, 10) || 0;
}

function clearInputs() {
  [
    'inp_sang', 'inp_toi', 'inp_tien_ck', 'inp_tien_ck_thuoc',
    'inp_tien_ck_dungcu', 'inp_tien_tra_hang',
    'inp_ca1', 'inp_ca2', 'inp_ca3', 'inp_ca4', 'inp_ck', 'inp_tra_them'
  ].forEach(id => {
    const input = $(id);
    if (input) input.value = '';
  });
  $('previewTongNh').textContent = '0 đ';
  $('previewTongTh').textContent = '0 đ';
}

function updatePreviewNh() {
  const total =
    getNum('inp_sang') +
    getNum('inp_toi') +
    getNum('inp_tien_ck') +
    getNum('inp_tien_ck_thuoc') +
    getNum('inp_tien_ck_dungcu');
  $('previewTongNh').textContent = fmt(total);
}

function updatePreviewTh() {
  const total =
    getNum('inp_ca1') +
    getNum('inp_ca2') +
    getNum('inp_ca3') +
    getNum('inp_ca4') +
    getNum('inp_ck');
  $('previewTongTh').textContent = fmt(total);
}

function toast(msg, type = 'success') {
  const elToast = document.createElement('div');
  elToast.className = `toast ${type}`;
  elToast.textContent = `${type === 'success' ? '✅' : '❌'} ${msg}`;
  $('toastContainer').prepend(elToast);
  setTimeout(() => elToast.remove(), 3000);
}

async function apiGet(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

async function apiPost(url, body) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const json = await response.json();
  if (!response.ok) throw new Error(json.error || 'Lỗi server');
  return json;
}

async function apiDelete(url) {
  const response = await fetch(url, { method: 'DELETE' });
  const json = await response.json();
  if (!response.ok) throw new Error(json.error || 'Lỗi server');
  return json;
}

function updateMonthDisplay() {
  el.monthDisplay.textContent = `Tháng ${state.month} / ${state.year}`;
}

function updateSectionTitles() {
  const meta = getTabMeta();
  el.formTitle.textContent = `📝 ${meta.formTitle}`;
  el.tableTitle.textContent = `📋 ${meta.tableTitle}`;
  el.mobileRecordsTitle.textContent = meta.mobileTitle;
  el.mobileRecordsSub.textContent = state.viewMode === 'mobile'
    ? 'Xem theo dạng thẻ, tối ưu cho điện thoại'
    : 'Chuyển sang Mobile để xem theo dạng thẻ';
  el.tabQuayThuoc.className = `tab-btn ${state.activeTab === 'quay_thuoc' ? 'active-nh' : ''}`;
  el.tabThuoc.className = `tab-btn ${state.activeTab === 'thuoc' ? 'active-th' : ''}`;
}

function saveCurrentFormToDraft() {
  if (!state.selectedDay) return;
  const isNh = state.activeTab === 'quay_thuoc';
  const tab = isNh ? 'quay_thuoc' : 'thuoc';
  const dbRec = state.data[tab].find(r => r.ngay === state.selectedDay) || {};

  if (isNh) {
    const current = {
      sang: getNum('inp_sang'),
      toi: getNum('inp_toi'),
      tien_ck: getNum('inp_tien_ck'),
      tien_ck_thuoc: getNum('inp_tien_ck_thuoc'),
      tien_ck_dungcu: getNum('inp_tien_ck_dungcu'),
      tien_tra_hang: getNum('inp_tien_tra_hang')
    };
    const hasDiff =
      current.sang !== (dbRec.sang || 0) ||
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
      ca1: getNum('inp_ca1'),
      ca2: getNum('inp_ca2'),
      ca3: getNum('inp_ca3'),
      ca4: getNum('inp_ca4'),
      ck: getNum('inp_ck'),
      tra_them: getNum('inp_tra_them')
    };
    const hasDiff =
      current.ca1 !== (dbRec.ca1 || 0) ||
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
  if (!state.selectedDay) return;
  const pill = document.querySelector(`.day-pill[data-ngay="${state.selectedDay}"]`);
  if (!pill) return;
  const tab = state.activeTab;
  pill.classList.toggle('has-draft', !!state.drafts[tab][state.selectedDay]);
}

async function loadMonth() {
  try {
    state.data = await apiGet(`/api/records/${monthKey()}`);
    renderAll();
    await loadKpi();
  } catch (error) {
    toast(`Lỗi tải dữ liệu: ${error.message}`, 'error');
  }
}

async function loadKpi() {
  try {
    const summary = await apiGet(`/api/summary/${monthKey()}`);
    const nh = summary.quay_thuoc;
    const th = summary.thuoc;
    const total = nh.tong_thang + th.tong_thang;
    const totalDays = Math.max(nh.so_ngay, th.so_ngay, 1);

    $('kpiNhTong').textContent = fmtShort(nh.tong_thang);
    $('kpiNhSub').textContent = `${nh.so_ngay} ngày • TB: ${fmtShort(nh.tb_ngay)}`;
    $('kpiThTong').textContent = fmtShort(th.tong_thang);
    $('kpiThSub').textContent = `${th.so_ngay} ngày • TB: ${fmtShort(th.tb_ngay)}`;
    $('kpiAllTong').textContent = fmtShort(total);
    $('kpiAllSub').textContent = `TB ngày: ${fmtShort(Math.round(total / totalDays))}`;
  } catch {
    // KPI is best-effort
  }
}

function switchTab(tab) {
  saveCurrentFormToDraft();
  state.activeTab = tab;
  state.selectedDay = null;
  clearInputs();
  updateSectionTitles();
  renderDaySelector();
  renderMobileRecords();
}

function renderDaySelector() {
  const total = daysInMonth();
  const isNh = state.activeTab === 'quay_thuoc';
  const existing = new Set((isNh ? state.data.quay_thuoc : state.data.thuoc).map(r => r.ngay));
  const colorClass = isNh ? 'has-data-nh' : 'has-data-th';
  const selectedClass = isNh ? 'selected-nh' : 'selected-th';
  const tab = state.activeTab;

  el.daySelector.innerHTML = '';
  for (let day = 1; day <= total; day += 1) {
    const ngay = `${day}.${state.month}`;
    const pill = document.createElement('button');
    pill.type = 'button';
    pill.className = 'day-pill';
    pill.textContent = day;
    pill.dataset.ngay = ngay;
    if (existing.has(ngay)) pill.classList.add(colorClass);
    if (ngay === state.selectedDay) pill.classList.add(selectedClass);
    if (state.drafts[tab][ngay]) pill.classList.add('has-draft');
    pill.addEventListener('click', () => selectDay(ngay, pill));
    el.daySelector.appendChild(pill);
  }
}

function selectDay(ngay, pill) {
  saveCurrentFormToDraft();
  state.selectedDay = ngay;
  document.querySelectorAll('.day-pill').forEach(button => {
    button.classList.remove('selected-nh', 'selected-th');
  });
  pill.classList.add(state.activeTab === 'quay_thuoc' ? 'selected-nh' : 'selected-th');
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
      $('inp_sang').value = formatInputNumber(draft.sang);
      $('inp_toi').value = formatInputNumber(draft.toi);
      $('inp_tien_ck').value = formatInputNumber(draft.tien_ck);
      $('inp_tien_ck_thuoc').value = formatInputNumber(draft.tien_ck_thuoc);
      $('inp_tien_ck_dungcu').value = formatInputNumber(draft.tien_ck_dungcu);
      $('inp_tien_tra_hang').value = formatInputNumber(draft.tien_tra_hang);
      updatePreviewNh();
    } else {
      $('inp_ca1').value = formatInputNumber(draft.ca1);
      $('inp_ca2').value = formatInputNumber(draft.ca2);
      $('inp_ca3').value = formatInputNumber(draft.ca3);
      $('inp_ca4').value = formatInputNumber(draft.ca4);
      $('inp_ck').value = formatInputNumber(draft.ck);
      $('inp_tra_them').value = formatInputNumber(draft.tra_them);
      updatePreviewTh();
    }
    return;
  }

  const rec = (isNh ? state.data.quay_thuoc : state.data.thuoc).find(r => r.ngay === ngay);
  if (!rec) return;

  if (isNh) {
    $('inp_sang').value = formatInputNumber(rec.sang);
    $('inp_toi').value = formatInputNumber(rec.toi);
    $('inp_tien_ck').value = formatInputNumber(rec.tien_ck);
    $('inp_tien_ck_thuoc').value = formatInputNumber(rec.tien_ck_thuoc);
    $('inp_tien_ck_dungcu').value = formatInputNumber(rec.tien_ck_dungcu);
    $('inp_tien_tra_hang').value = formatInputNumber(rec.tien_tra_hang);
    updatePreviewNh();
  } else {
    $('inp_ca1').value = formatInputNumber(rec.ca1);
    $('inp_ca2').value = formatInputNumber(rec.ca2);
    $('inp_ca3').value = formatInputNumber(rec.ca3);
    $('inp_ca4').value = formatInputNumber(rec.ca4);
    $('inp_ck').value = formatInputNumber(rec.ck);
    $('inp_tra_them').value = formatInputNumber(rec.tra_them);
    updatePreviewTh();
  }
}

function renderTableNh() {
  const recs = state.data.quay_thuoc || [];
  const body = $('bodyNh');
  const foot = $('footNh');

  if (!recs.length) {
    body.innerHTML = `<tr><td colspan="9"><div class="empty-state"><span class="icon">🏠</span><p>Chưa có dữ liệu tháng này</p></div></td></tr>`;
    foot.innerHTML = '';
    return;
  }

  body.innerHTML = recs.map(rec => `
    <tr>
      <td><strong>${rec.ngay}</strong></td>
      <td>${fmtNum(rec.sang)}</td>
      <td>${fmtNum(rec.toi)}</td>
      <td>${fmtNum(rec.tien_ck)}</td>
      <td>${fmtNum(rec.tien_ck_thuoc)}</td>
      <td>${fmtNum(rec.tien_ck_dungcu)}</td>
      <td>${fmtNum(rec.tien_tra_hang)}</td>
      <td class="col-tong col-tong-nh">${fmtNum(rec.tong)}</td>
      <td>
        <div class="actions-col">
          <button class="btn btn-outline btn-sm" onclick="editNh('${rec.ngay}')">✏️</button>
          <button class="btn btn-danger btn-sm" onclick="confirmDelete('quay_thuoc','${rec.ngay}')">🗑</button>
        </div>
      </td>
    </tr>
  `).join('');

  const sum = (key) => recs.reduce((total, rec) => total + (rec[key] || 0), 0);
  const sumTong = recs.reduce((total, rec) => total + (rec.tong || 0), 0);

  foot.innerHTML = `
    <tr class="row-total">
      <td><strong>TỔNG (${recs.length} ngày)</strong></td>
      <td>${fmtNum(sum('sang'))}</td>
      <td>${fmtNum(sum('toi'))}</td>
      <td>${fmtNum(sum('tien_ck'))}</td>
      <td>${fmtNum(sum('tien_ck_thuoc'))}</td>
      <td>${fmtNum(sum('tien_ck_dungcu'))}</td>
      <td>${fmtNum(sum('tien_tra_hang'))}</td>
      <td class="col-tong col-tong-nh">${fmtNum(sumTong)}</td>
      <td></td>
    </tr>
  `;
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

  body.innerHTML = recs.map(rec => `
    <tr>
      <td><strong>${rec.ngay}</strong></td>
      <td>${fmtNum(rec.ca1)}</td>
      <td>${fmtNum(rec.ca2)}</td>
      <td>${fmtNum(rec.ca3)}</td>
      <td>${fmtNum(rec.ca4)}</td>
      <td>${fmtNum(rec.ck)}</td>
      <td>${fmtNum(rec.tra_them)}</td>
      <td class="col-tong col-tong-th">${fmtNum(rec.tong)}</td>
      <td>
        <div class="actions-col">
          <button class="btn btn-outline btn-sm" onclick="editTh('${rec.ngay}')">✏️</button>
          <button class="btn btn-danger btn-sm" onclick="confirmDelete('thuoc','${rec.ngay}')">🗑</button>
        </div>
      </td>
    </tr>
  `).join('');

  const sum = (key) => recs.reduce((total, rec) => total + (rec[key] || 0), 0);
  const sumTong = recs.reduce((total, rec) => total + (rec.tong || 0), 0);

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
    </tr>
  `;
}

function renderMobileRecords() {
  const meta = getTabMeta();
  const recs = state.data[state.activeTab] || [];
  const list = el.mobileRecordsList;

  if (!list) return;

  if (!recs.length) {
    list.innerHTML = `
      <div class="empty-state">
        <span class="icon">${meta.emptyIcon}</span>
        <p>Chưa có dữ liệu tháng này</p>
      </div>
    `;
    return;
  }

  list.innerHTML = recs.map(rec => {
    const fields = state.activeTab === 'quay_thuoc'
      ? [
        ['Sáng', rec.sang],
        ['Tối', rec.toi],
        ['CK', rec.tien_ck],
        ['CK thuốc', rec.tien_ck_thuoc],
        ['CK dụng cụ', rec.tien_ck_dungcu],
        ['Trả hàng', rec.tien_tra_hang]
      ]
      : [
        ['6h30-13h', rec.ca1],
        ['13h-17h', rec.ca2],
        ['17h-20h', rec.ca3],
        ['20h-22h30', rec.ca4],
        ['CK', rec.ck],
        ['Trả thêm', rec.tra_them]
      ];

    const totalClass = state.activeTab === 'quay_thuoc' ? '' : 'th';

    return `
      <article class="mobile-record-card">
        <div class="mobile-record-card-head">
          <div class="mobile-record-day">${rec.ngay}</div>
          <div class="mobile-record-total ${totalClass}">${fmt(rec.tong)}</div>
        </div>
        <div class="mobile-record-grid">
          ${fields.map(([label, value]) => `
            <div class="mobile-record-item">
              <span class="mobile-record-label">${label}</span>
              <span class="mobile-record-value">${fmtNum(value)}</span>
            </div>
          `).join('')}
        </div>
        <div class="mobile-record-actions">
          <button class="btn btn-outline btn-sm" type="button" onclick="${state.activeTab === 'quay_thuoc' ? `editNh('${rec.ngay}')` : `editTh('${rec.ngay}')`}">Sửa</button>
          <button class="btn btn-danger btn-sm" type="button" onclick="confirmDelete('${state.activeTab}','${rec.ngay}')">Xóa</button>
        </div>
      </article>
    `;
  }).join('');
}

function renderAll() {
  updateSectionTitles();
  renderTableNh();
  renderTableTh();
  renderMobileRecords();
  renderDaySelector();
}

function fmtNum(n) {
  if (!n && n !== 0) return '<span class="text-muted">—</span>';
  return Number(n).toLocaleString('vi-VN');
}

async function saveNh() {
  if (!state.selectedDay) {
    toast('Vui lòng chọn ngày', 'error');
    return;
  }
  const body = {
    ngay: state.selectedDay,
    sang: getNum('inp_sang'),
    toi: getNum('inp_toi'),
    tien_ck: getNum('inp_tien_ck'),
    tien_ck_thuoc: getNum('inp_tien_ck_thuoc'),
    tien_ck_dungcu: getNum('inp_tien_ck_dungcu'),
    tien_tra_hang: getNum('inp_tien_tra_hang')
  };
  try {
    await apiPost(`/api/records/${monthKey()}/quay_thuoc`, body);
    toast(`Đã lưu ngày ${state.selectedDay}`);
    delete state.drafts.quay_thuoc[state.selectedDay];
    await loadMonth();
  } catch (error) {
    toast(error.message, 'error');
  }
}

async function saveTh() {
  if (!state.selectedDay) {
    toast('Vui lòng chọn ngày', 'error');
    return;
  }
  const body = {
    ngay: state.selectedDay,
    ca1: getNum('inp_ca1'),
    ca2: getNum('inp_ca2'),
    ca3: getNum('inp_ca3'),
    ca4: getNum('inp_ca4'),
    ck: getNum('inp_ck'),
    tra_them: getNum('inp_tra_them')
  };
  try {
    await apiPost(`/api/records/${monthKey()}/thuoc`, body);
    toast(`Đã lưu ngày ${state.selectedDay}`);
    delete state.drafts.thuoc[state.selectedDay];
    await loadMonth();
  } catch (error) {
    toast(error.message, 'error');
  }
}

function confirmDelete(type, ngay) {
  state.pendingDelete = { type, ngay };
  const meta = getTabMeta(type);
  el.modalDeleteMsg.textContent = `Xóa dữ liệu ngày ${ngay} (${meta.label})?`;
  el.modalDelete.classList.remove('hidden');
}

async function handleDeleteConfirm() {
  if (!state.pendingDelete) return;
  const { type, ngay } = state.pendingDelete;
  el.modalDelete.classList.add('hidden');
  try {
    await apiDelete(`/api/records/${monthKey()}/${type}/${encodeURIComponent(ngay)}`);
    toast(`Đã xóa ngày ${ngay}`);
    state.pendingDelete = null;
    delete state.drafts[type][ngay];
    if (state.selectedDay === ngay) {
      state.selectedDay = null;
      clearInputs();
    }
    await loadMonth();
  } catch (error) {
    toast(error.message, 'error');
  }
}

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

function formatInputOnType(event) {
  const input = event.target;
  let rawValue = input.value.replace(/\D/g, '');

  if (rawValue === '') {
    input.value = '';
    return;
  }

  if (rawValue.length > 3 && rawValue.endsWith('000')) {
    rawValue = rawValue.slice(0, -3);
  }

  if (rawValue === '' || /^0+$/.test(rawValue)) {
    input.value = '';
    return;
  }

  const formatted = Number(`${rawValue}000`).toLocaleString('vi-VN');
  input.value = formatted;
  const cursorPosition = Math.max(formatted.length - 4, 0);
  input.setSelectionRange(cursorPosition, cursorPosition);
}

function wireNumericInputs() {
  const nhInputs = ['inp_sang', 'inp_toi', 'inp_tien_ck', 'inp_tien_ck_thuoc', 'inp_tien_ck_dungcu', 'inp_tien_tra_hang'];
  const thInputs = ['inp_ca1', 'inp_ca2', 'inp_ca3', 'inp_ca4', 'inp_ck', 'inp_tra_them'];

  [...nhInputs, ...thInputs].forEach(id => {
    const input = $(id);
    if (!input) return;
    input.addEventListener('input', formatInputOnType);
    input.addEventListener('input', input.id.startsWith('inp_ca') || input.id === 'inp_ck' || input.id === 'inp_tra_them' ? updatePreviewTh : updatePreviewNh);
    input.addEventListener('input', updateDraftIndicator);
  });
}

function wireEvents() {
  el.tabQuayThuoc.addEventListener('click', () => switchTab('quay_thuoc'));
  el.tabThuoc.addEventListener('click', () => switchTab('thuoc'));
  el.btnViewDesktop.addEventListener('click', () => saveViewMode('desktop'));
  el.btnViewMobile.addEventListener('click', () => saveViewMode('mobile'));
  el.btnPrevMonth.addEventListener('click', () => {
    saveCurrentFormToDraft();
    state.drafts = { quay_thuoc: {}, thuoc: {} };
    state.selectedDay = null;
    state.month -= 1;
    if (state.month < 1) {
      state.month = 12;
      state.year -= 1;
    }
    updateMonthDisplay();
    loadMonth();
  });
  el.btnNextMonth.addEventListener('click', () => {
    saveCurrentFormToDraft();
    state.drafts = { quay_thuoc: {}, thuoc: {} };
    state.selectedDay = null;
    state.month += 1;
    if (state.month > 12) {
      state.month = 1;
      state.year += 1;
    }
    updateMonthDisplay();
    loadMonth();
  });
  el.btnSaveNh.addEventListener('click', saveNh);
  el.btnSaveTh.addEventListener('click', saveTh);
  $('btnCloseModal').addEventListener('click', () => el.modalDelete.classList.add('hidden'));
  $('btnCancelDelete').addEventListener('click', () => el.modalDelete.classList.add('hidden'));
  $('btnConfirmDelete').addEventListener('click', handleDeleteConfirm);
  el.btnExport.addEventListener('click', () => {
    window.location.href = `/api/export/${monthKey()}`;
  });
}

window.editNh = editNh;
window.editTh = editTh;
window.confirmDelete = confirmDelete;

document.addEventListener('DOMContentLoaded', () => {
  el.tabNav?.classList.remove('hidden');
  saveViewMode(getInitialViewMode());
  updateMonthDisplay();
  updateSectionTitles();
  wireEvents();
  wireNumericInputs();
  loadMonth();
});
