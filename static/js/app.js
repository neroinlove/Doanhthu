/* ====================================================
   Dashboard Doanh Thu - app.js
   Quầy thuốc only
   ==================================================== */

const state = {
  viewMode: 'desktop',
  year: new Date().getFullYear(),
  month: new Date().getMonth() + 1,
  data: { quay_thuoc: [] },
  selectedDay: null,
  pendingDelete: null,
  drafts: {},
  autosaveTimer: null,
  imageImportRows: [],
  imageImportItems: [],
  selectedImportField: null
};

const AUTOSAVE_DELAY_MS = 800;
const IMAGE_IMPORT_FIELDS = {
  tien_ck: 'Tiền CK (TK chính)',
  tien_ck_dungcu: 'Tiền CK dụng cụ',
  tien_ck_thuoc: 'Tiền CK thuốc'
};

const VIEW_KEY = 'doanhthu.viewMode';
const $ = id => document.getElementById(id);

const el = {
  monthDisplay: $('monthDisplay'),
  formTitle: $('formTitle'),
  tableTitle: $('tableTitle'),
  mobileRecordsTitle: $('mobileRecordsTitle'),
  mobileRecordsSub: $('mobileRecordsSub'),
  daySelector: $('daySelector'),
  mobileRecordsList: $('mobileRecordsList'),
  modalDelete: $('modalDelete'),
  modalDeleteMsg: $('modalDeleteMsg'),
  btnViewDesktop: $('btnViewDesktop'),
  btnViewMobile: $('btnViewMobile'),
  btnExport: $('btnExport'),
  btnPrevMonth: $('btnPrevMonth'),
  btnNextMonth: $('btnNextMonth'),
  btnSaveNh: $('btnSaveNh'),
  btnOpenImageImport: $('btnOpenImageImport'),
  modalImageImport: $('modalImageImport'),
  btnCloseImageImport: $('btnCloseImageImport'),
  btnClearImageImport: $('btnClearImageImport'),
  btnConfirmImageImport: $('btnConfirmImageImport'),
  imageImportFiles: $('imageImportFiles'),
  importEndDate: $('importEndDate'),
  imageImportPreview: $('imageImportPreview'),
  imageImportRows: $('imageImportRows'),
  imageImportTabs: $('imageImportTabs'),
  imageImportPreviewImg: $('imageImportPreviewImg')
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

function toIsoDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function recordDayKey(date) {
  return `${date.getDate()}.${date.getMonth() + 1}`;
}

function recordMonthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
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
  ['inp_sang', 'inp_toi', 'inp_tien_ck', 'inp_tien_ck_thuoc', 'inp_tien_ck_dungcu', 'inp_tien_tra_hang']
    .forEach(id => {
      const input = $(id);
      if (input) input.value = '';
    });
  $('previewTongNh').textContent = '0 đ';
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

function getCurrentNhRecord() {
  return {
    sang: getNum('inp_sang'),
    toi: getNum('inp_toi'),
    tien_ck: getNum('inp_tien_ck'),
    tien_ck_thuoc: getNum('inp_tien_ck_thuoc'),
    tien_ck_dungcu: getNum('inp_tien_ck_dungcu'),
    tien_tra_hang: getNum('inp_tien_tra_hang')
  };
}

function shouldSaveRecord(current, dbRec) {
  const isEmpty =
    current.sang === 0 &&
    current.toi === 0 &&
    current.tien_ck === 0 &&
    current.tien_ck_thuoc === 0 &&
    current.tien_ck_dungcu === 0 &&
    current.tien_tra_hang === 0;
  const hasDiff =
    current.sang !== (dbRec.sang || 0) ||
    current.toi !== (dbRec.toi || 0) ||
    current.tien_ck !== (dbRec.tien_ck || 0) ||
    current.tien_ck_thuoc !== (dbRec.tien_ck_thuoc || 0) ||
    current.tien_ck_dungcu !== (dbRec.tien_ck_dungcu || 0) ||
    current.tien_tra_hang !== (dbRec.tien_tra_hang || 0);

  return hasDiff || (!!dbRec.ngay && isEmpty);
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

async function apiAnalyzeImage(file) {
  const formData = new FormData();
  formData.append('image', file);
  const response = await fetch('/api/analyze-image', {
    method: 'POST',
    body: formData
  });
  const json = await response.json();
  if (!response.ok) throw new Error(json.error || 'Lỗi đọc ảnh');
  return json;
}

function updateMonthDisplay() {
  el.monthDisplay.textContent = `Tháng ${state.month} / ${state.year}`;
}

function updateSectionTitles() {
  el.formTitle.textContent = '📝 Nhập liệu - Quầy Thuốc';
  el.tableTitle.textContent = '📋 Tổng hợp tháng - Quầy Thuốc';
  el.mobileRecordsTitle.textContent = 'Danh sách ngày - Quầy Thuốc';
  el.mobileRecordsSub.textContent = state.viewMode === 'mobile'
    ? 'Xem theo dạng thẻ, tối ưu cho điện thoại'
    : 'Chuyển sang Mobile để xem theo dạng thẻ';
}

function saveCurrentFormToDraft() {
  if (!state.selectedDay) return;
  const dbRec = state.data.quay_thuoc.find(r => r.ngay === state.selectedDay) || {};
  const current = getCurrentNhRecord();
  if (shouldSaveRecord(current, dbRec)) {
    state.drafts[state.selectedDay] = current;
  } else {
    delete state.drafts[state.selectedDay];
  }
}

function updateDraftIndicator() {
  saveCurrentFormToDraft();
  if (!state.selectedDay) return;
  const pill = document.querySelector(`.day-pill[data-ngay="${state.selectedDay}"]`);
  if (!pill) return;
  pill.classList.toggle('has-draft', !!state.drafts[state.selectedDay]);
}

function scheduleAutosave() {
  if (!state.selectedDay) return;
  clearTimeout(state.autosaveTimer);
  state.autosaveTimer = setTimeout(() => {
    persistCurrentForm(state.selectedDay, { silent: true }).catch(() => {});
  }, AUTOSAVE_DELAY_MS);
}

function flushAutosave() {
  if (!state.selectedDay) return;
  clearTimeout(state.autosaveTimer);
  state.autosaveTimer = null;
  return persistCurrentForm(state.selectedDay, { silent: true }).catch(() => {});
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
    const totalDays = Math.max(nh.so_ngay, 1);

    $('kpiNhTong').textContent = fmtShort(nh.tong_thang);
    $('kpiNhSub').textContent = `${nh.so_ngay} ngày • TB: ${fmtShort(nh.tb_ngay)}`;
    $('kpiAllTong').textContent = fmtShort(nh.tong_thang);
    $('kpiAllSub').textContent = `TB ngày: ${fmtShort(Math.round(nh.tong_thang / totalDays))}`;
  } catch {
    // KPI is best-effort
  }
}

function renderDaySelector() {
  const total = daysInMonth();
  const existing = new Set((state.data.quay_thuoc || []).map(r => r.ngay));

  el.daySelector.innerHTML = '';
  for (let day = 1; day <= total; day += 1) {
    const ngay = `${day}.${state.month}`;
    const pill = document.createElement('button');
    pill.type = 'button';
    pill.className = 'day-pill';
    pill.textContent = day;
    pill.dataset.ngay = ngay;
    if (existing.has(ngay)) pill.classList.add('has-data-nh');
    if (ngay === state.selectedDay) pill.classList.add('selected-nh');
    if (state.drafts[ngay]) pill.classList.add('has-draft');
    pill.addEventListener('click', () => selectDay(ngay, pill));
    el.daySelector.appendChild(pill);
  }
}

function selectDay(ngay, pill) {
  saveCurrentFormToDraft();
  flushAutosave();
  state.selectedDay = ngay;
  document.querySelectorAll('.day-pill').forEach(button => button.classList.remove('selected-nh'));
  pill.classList.add('selected-nh');
  loadDayIntoForm(ngay);
  renderDaySelector();
}

function loadDayIntoForm(ngay) {
  const draft = state.drafts[ngay];
  clearInputs();

  if (draft) {
    $('inp_sang').value = formatInputNumber(draft.sang);
    $('inp_toi').value = formatInputNumber(draft.toi);
    $('inp_tien_ck').value = formatInputNumber(draft.tien_ck);
    $('inp_tien_ck_thuoc').value = formatInputNumber(draft.tien_ck_thuoc);
    $('inp_tien_ck_dungcu').value = formatInputNumber(draft.tien_ck_dungcu);
    $('inp_tien_tra_hang').value = formatInputNumber(draft.tien_tra_hang);
    updatePreviewNh();
    return;
  }

  const rec = (state.data.quay_thuoc || []).find(r => r.ngay === ngay);
  if (!rec) return;

  $('inp_sang').value = formatInputNumber(rec.sang);
  $('inp_toi').value = formatInputNumber(rec.toi);
  $('inp_tien_ck').value = formatInputNumber(rec.tien_ck);
  $('inp_tien_ck_thuoc').value = formatInputNumber(rec.tien_ck_thuoc);
  $('inp_tien_ck_dungcu').value = formatInputNumber(rec.tien_ck_dungcu);
  $('inp_tien_tra_hang').value = formatInputNumber(rec.tien_tra_hang);
  updatePreviewNh();
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

  const sum = key => recs.reduce((total, rec) => total + (rec[key] || 0), 0);
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

function renderMobileRecords() {
  const recs = state.data.quay_thuoc || [];
  const list = el.mobileRecordsList;
  if (!list) return;

  if (!recs.length) {
    list.innerHTML = `
      <div class="empty-state">
        <span class="icon">🏠</span>
        <p>Chưa có dữ liệu tháng này</p>
      </div>
    `;
    return;
  }

  list.innerHTML = recs.map(rec => {
    const fields = [
      ['Sáng', rec.sang],
      ['Tối', rec.toi],
      ['CK', rec.tien_ck],
      ['CK thuốc', rec.tien_ck_thuoc],
      ['CK dụng cụ', rec.tien_ck_dungcu],
      ['Trả hàng', rec.tien_tra_hang]
    ];

    return `
      <article class="mobile-record-card">
        <div class="mobile-record-card-head">
          <div class="mobile-record-day">${rec.ngay}</div>
          <div class="mobile-record-total">${fmt(rec.tong)}</div>
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
          <button class="btn btn-outline btn-sm" type="button" onclick="editNh('${rec.ngay}')">Sửa</button>
          <button class="btn btn-danger btn-sm" type="button" onclick="confirmDelete('quay_thuoc','${rec.ngay}')">Xóa</button>
        </div>
      </article>
    `;
  }).join('');
}

function renderAll() {
  updateSectionTitles();
  renderTableNh();
  renderMobileRecords();
  renderDaySelector();
}

function fmtNum(n) {
  if (!n && n !== 0) return '<span class="text-muted">—</span>';
  return Number(n).toLocaleString('vi-VN');
}

async function saveNh() {
  await persistCurrentForm(state.selectedDay, { silent: false });
}

async function persistCurrentForm(day = state.selectedDay, { silent = true } = {}) {
  if (!day) {
    if (!silent) toast('Vui lòng chọn ngày', 'error');
    return false;
  }

  const dbRec = state.data.quay_thuoc.find(r => r.ngay === day) || {};
  const current = getCurrentNhRecord();
  if (!shouldSaveRecord(current, dbRec)) {
    delete state.drafts[day];
    if (!silent) toast('Không có thay đổi để lưu', 'success');
    return false;
  }

  try {
    await apiPost(`/api/records/${monthKey()}/quay_thuoc`, {
      ngay: day,
      ...current
    });
    delete state.drafts[day];
    await loadMonth();
    if (!silent) toast(`Đã lưu ngày ${day}`);
    return true;
  } catch (error) {
    toast(error.message, 'error');
    return false;
  }
}

function confirmDelete(type, ngay) {
  state.pendingDelete = { type, ngay };
  el.modalDeleteMsg.textContent = `Xóa dữ liệu ngày ${ngay} (Quầy Thuốc)?`;
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
    delete state.drafts[ngay];
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

function formatPlainAmountInput(event) {
  const input = event.target;
  const rawValue = input.value.replace(/\D/g, '');
  input.value = rawValue ? Number(rawValue).toLocaleString('vi-VN') : '';
}

function parsePlainAmount(value) {
  return parseInt(String(value || '').replace(/\D/g, ''), 10) || 0;
}

function median(values) {
  const sorted = values.filter(value => Number.isFinite(value) && value > 0).sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function openImageImportModal() {
  if (!el.importEndDate.value) {
    el.importEndDate.value = toIsoDate(new Date());
  }
  el.modalImageImport.classList.remove('hidden');
}

function closeImageImportModal() {
  el.modalImageImport.classList.add('hidden');
}

function clearImageImport() {
  state.imageImportRows = [];
  state.imageImportItems.forEach(item => {
    if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
  });
  state.imageImportItems = [];
  state.selectedImportField = null;
  el.imageImportFiles.value = '';
  renderImageImportPreview();
}

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(image.src);
      resolve(image);
    };
    image.onerror = reject;
    image.src = URL.createObjectURL(file);
  });
}

function isChartBarPixel(r, g, b) {
  return r < 95 && g > 140 && b > 140 && g - r > 45 && b - r > 45 && Math.abs(g - b) < 75;
}

async function detectRevenueBars(file, options = {}) {
  const maxMillion = Number(options.maxMillion) || 6;
  const expectedDays = Number(options.expectedDays) || 0;
  const image = await loadImageFromFile(file);
  const canvas = document.createElement('canvas');
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(image, 0, 0, width, height);

  const xStart = Math.floor(width * 0.10);
  const xEnd = Math.floor(width * 0.92);
  const yStart = Math.floor(height * 0.24);
  const yEnd = Math.floor(height * 0.48);
  const imageData = ctx.getImageData(xStart, yStart, xEnd - xStart, yEnd - yStart);
  const data = imageData.data;
  const regionWidth = imageData.width;
  const regionHeight = imageData.height;
  const columns = [];

  for (let x = 0; x < regionWidth; x += 1) {
    let count = 0;
    let top = regionHeight;
    let bottom = 0;

    for (let y = 0; y < regionHeight; y += 1) {
      const idx = (y * regionWidth + x) * 4;
      if (isChartBarPixel(data[idx], data[idx + 1], data[idx + 2])) {
        count += 1;
        if (y < top) top = y;
        if (y > bottom) bottom = y;
      }
    }

    columns.push({ x, count, top, bottom });
  }

  const activeThreshold = Math.max(8, Math.round(regionHeight * 0.012));
  const groups = [];
  let current = null;

  columns.forEach(col => {
    if (col.count >= activeThreshold) {
      if (!current) {
        current = { start: col.x, end: col.x, top: col.top, bottom: col.bottom, count: col.count };
      } else {
        current.end = col.x;
        current.top = Math.min(current.top, col.top);
        current.bottom = Math.max(current.bottom, col.bottom);
        current.count += col.count;
      }
    } else if (current) {
      groups.push(current);
      current = null;
    }
  });
  if (current) groups.push(current);

  const minWidth = Math.max(4, Math.round(width * 0.004));
  const maxWidth = Math.max(24, Math.round(width * 0.045));
  const bars = groups
    .filter(group => group.end - group.start + 1 >= minWidth && group.end - group.start + 1 <= maxWidth)
    .map(group => ({
      ...group,
      center: xStart + Math.round((group.start + group.end) / 2),
      top: yStart + group.top,
      bottom: yStart + group.bottom,
      width: group.end - group.start + 1
    }))
    .sort((a, b) => a.center - b.center);

  if (!bars.length) {
    throw new Error('Không tìm thấy cột doanh thu trong ảnh');
  }

  const axisTop = Math.min(...bars.map(bar => bar.top));
  const bottoms = bars.map(bar => bar.bottom).sort((a, b) => a - b);
  const axisBottom = bottoms[Math.floor(bottoms.length * 0.9)] || Math.max(...bars.map(bar => bar.bottom));
  const axisHeight = Math.max(1, axisBottom - axisTop);
  const confidence = bars.length >= 25 && bars.length <= 31 ? 85 : 65;
  const firstCenter = bars[0]?.center || 0;
  const lastCenter = bars[bars.length - 1]?.center || firstCenter;
  const centerGaps = bars.slice(1).map((bar, index) => bar.center - bars[index].center);
  const measuredSlotWidth = median(centerGaps);
  const slotWidth = measuredSlotWidth || (expectedDays > 1 && lastCenter > firstCenter
    ? (lastCenter - firstCenter) / (expectedDays - 1)
    : 0);
  const anchorToEnd = expectedDays > 1 && slotWidth > 0;

  const detected = bars.map((bar, index) => {
    const ratio = Math.max(0, Math.min(1, (axisBottom - bar.top) / axisHeight));
    const rawAmount = ratio * maxMillion * 1_000_000;
    const dayOffset = slotWidth
      ? anchorToEnd
        ? Math.max(0, Math.min(expectedDays - 1, expectedDays - 1 + Math.round((bar.center - lastCenter) / slotWidth)))
        : Math.max(0, Math.min(expectedDays - 1, Math.round((bar.center - firstCenter) / slotWidth)))
      : index;
    return {
      amount: Math.round(rawAmount / 1_000) * 1_000,
      ratio,
      confidence,
      dayOffset
    };
  });

  const valueLabels = Array.isArray(options.valueLabels) ? options.valueLabels : [];
  if (valueLabels.length && valueLabels.length === detected.length) {
    return detected.map((bar, index) => ({
      ...bar,
      amount: Math.round(valueLabels[index] / 1_000) * 1_000,
      confidence: 98
    }));
  }

  if (valueLabels.length && options.revenueTotal && valueLabels.length === detected.length - 1) {
    const knownTotal = valueLabels.reduce((total, amount) => total + amount, 0);
    const missingAmount = Math.max(0, options.revenueTotal - knownTotal);
    return detected.map((bar, index) => ({
      ...bar,
      amount: Math.round((valueLabels[index] ?? missingAmount) / 1_000) * 1_000,
      confidence: 96
    }));
  }

  if (options.revenueTotal) {
    const estimatedTotal = detected.reduce((total, bar) => total + bar.amount, 0);
    const factor = estimatedTotal ? options.revenueTotal / estimatedTotal : 1;
    return detected.map(bar => ({
      ...bar,
      amount: Math.round((bar.amount * factor) / 1_000) * 1_000,
      confidence: Math.min(95, bar.confidence + 8)
    }));
  }

  return detected;
}

async function rebuildImageImportRows() {
  const endDateValue = el.importEndDate.value;
  const fallbackEndDate = endDateValue ? new Date(`${endDateValue}T00:00:00`) : new Date();
  const nextRows = [];

  for (const item of state.imageImportItems) {
    const endDate = item.endDate ? new Date(`${item.endDate}T00:00:00`) : fallbackEndDate;
    const labels = Array.isArray(item.valueLabels) ? item.valueLabels : [];
    const expectedDays = Number(item.rangeDays) || 0;
    // Nhãn OCR chỉ an toàn khi đọc đủ toàn bộ số ngày trong biểu đồ.
    // Thiếu một nhãn sẽ làm dữ liệu bị dồn sang các ngày sai vị trí.
    const hasCompleteValueLabels = expectedDays > 0 && labels.length === expectedDays;
    const bars = hasCompleteValueLabels
      ? labels.map(amount => ({
        amount: Math.round(amount / 1_000) * 1_000,
        confidence: 98
      }))
      : await detectRevenueBars(item.file, {
        maxMillion: item.maxMillion || 6,
        revenueTotal: item.revenueTotal,
        expectedDays
      });
    bars.forEach((bar, index) => {
      const rangeDays = hasCompleteValueLabels ? bars.length : (expectedDays || bars.length);
      const dayOffset = hasCompleteValueLabels ? index : (Number.isInteger(bar.dayOffset) ? bar.dayOffset : index);
      const date = addDays(endDate, dayOffset - rangeDays + 1);
      nextRows.push({
        id: `${item.field}-${toIsoDate(date)}`,
        field: item.field,
        source: item.source,
        date: toIsoDate(date),
        month: recordMonthKey(date),
        ngay: recordDayKey(date),
        amount: bar.amount,
        confidence: bar.confidence
      });
    });
  }

  state.imageImportRows = nextRows.sort((a, b) => a.date.localeCompare(b.date) || a.field.localeCompare(b.field));
  const monthCache = {};
  for (const row of state.imageImportRows) {
    if (!monthCache[row.month]) {
      monthCache[row.month] = await apiGet(`/api/records/${row.month}`);
    }
    const existing = monthCache[row.month].quay_thuoc.find(item => item.ngay === row.ngay);
    row.existingAmount = Number(existing?.[row.field]) || 0;
    row.overwrite = false;
  }
  renderImageImportPreview();
}

async function autoDetectImageSettings(file) {
  const result = await apiAnalyzeImage(file);
  if (result.end_date) {
    el.importEndDate.value = result.end_date;
  }

  return result;
}

function renderImageImportPreview() {
  if (!state.imageImportRows.length) {
    el.imageImportPreview.classList.add('hidden');
    el.imageImportRows.innerHTML = '';
    el.imageImportTabs.innerHTML = '';
    el.imageImportPreviewImg.removeAttribute('src');
    return;
  }

  el.imageImportPreview.classList.remove('hidden');
  if (!state.selectedImportField || !state.imageImportItems.some(item => item.field === state.selectedImportField)) {
    state.selectedImportField = state.imageImportItems[0]?.field || null;
  }

  el.imageImportTabs.innerHTML = state.imageImportItems.map(item => `
    <button
      type="button"
      class="import-image-tab ${item.field === state.selectedImportField ? 'active' : ''}"
      data-import-preview-field="${item.field}"
    >
      ${IMAGE_IMPORT_FIELDS[item.field]}
    </button>
  `).join('');

  const selectedItem = state.imageImportItems.find(item => item.field === state.selectedImportField);
  if (selectedItem?.previewUrl) {
    el.imageImportPreviewImg.src = selectedItem.previewUrl;
    el.imageImportPreviewImg.alt = selectedItem.source || IMAGE_IMPORT_FIELDS[selectedItem.field];
  }

  el.imageImportRows.innerHTML = state.imageImportRows.map((row, index) => `
    <tr class="import-row-source ${row.field === state.selectedImportField ? 'active' : ''}" data-import-row-field="${row.field}">
      <td>${row.ngay}</td>
      <td>${IMAGE_IMPORT_FIELDS[row.field]}</td>
      <td>
        <input
          type="text"
          inputmode="numeric"
          class="form-input import-amount-input"
          data-import-index="${index}"
          value="${formatInputNumber(row.amount)}"
        >
      </td>
      <td>${row.existingAmount ? formatInputNumber(row.existingAmount) : '<span class="text-muted">Chưa có</span>'}</td>
      <td>
        <label class="import-overwrite-option">
          <input
            type="checkbox"
            data-import-overwrite-index="${index}"
            ${row.overwrite ? 'checked' : ''}
            ${row.existingAmount ? '' : 'disabled'}
          >
          <span>${row.existingAmount ? 'Ghi đè' : 'Nhập mới'}</span>
        </label>
      </td>
      <td>${row.source || '—'}</td>
      <td><span class="import-confidence">${row.confidence}%</span></td>
    </tr>
  `).join('');

  document.querySelectorAll('[data-import-preview-field]').forEach(button => {
    button.addEventListener('click', () => {
      state.selectedImportField = button.dataset.importPreviewField;
      renderImageImportPreview();
    });
  });

  document.querySelectorAll('[data-import-row-field]').forEach(row => {
    row.addEventListener('click', event => {
      if (event.target.matches('input')) return;
      state.selectedImportField = row.dataset.importRowField;
      renderImageImportPreview();
    });
  });

  document.querySelectorAll('[data-import-index]').forEach(input => {
    input.addEventListener('input', formatPlainAmountInput);
    input.addEventListener('input', () => {
      const index = Number(input.dataset.importIndex);
      state.imageImportRows[index].amount = parsePlainAmount(input.value);
    });
  });

  document.querySelectorAll('[data-import-overwrite-index]').forEach(input => {
    input.addEventListener('change', event => {
      const index = Number(event.target.dataset.importOverwriteIndex);
      state.imageImportRows[index].overwrite = event.target.checked;
    });
  });
}

async function handleImageImportFileChange(event) {
  const input = event.target;
  const files = Array.from(input.files || []);
  if (!files.length) return;

  try {
    for (const file of files) {
      const detected = await autoDetectImageSettings(file);
      if (!detected.field) {
        throw new Error(`Không nhận diện được loại ví trong ảnh ${file.name}`);
      }

      state.imageImportItems
        .filter(item => item.field === detected.field && item.previewUrl)
        .forEach(item => URL.revokeObjectURL(item.previewUrl));
      state.imageImportItems = state.imageImportItems.filter(item => item.field !== detected.field);
      state.imageImportItems.push({
        file,
        field: detected.field,
        source: detected.field_label || IMAGE_IMPORT_FIELDS[detected.field],
        maxMillion: Number(detected.max_million) || 6,
        revenueTotal: Number(detected.revenue_total) || 0,
        rangeDays: Number(detected.range_days) || 0,
        valueLabels: Array.isArray(detected.value_labels) ? detected.value_labels : [],
        endDate: detected.end_date || null,
        previewUrl: URL.createObjectURL(file)
      });
      state.selectedImportField = detected.field;
    }

    await rebuildImageImportRows();
    toast(`Đã nhận diện ${files.length} ảnh, vui lòng kiểm tra bảng preview`);
  } catch (error) {
    input.value = '';
    toast(error.message, 'error');
  }
}

function buildEmptyRecord(ngay) {
  return {
    ngay,
    sang: 0,
    toi: 0,
    tien_ck: 0,
    tien_ck_thuoc: 0,
    tien_ck_dungcu: 0,
    tien_tra_hang: 0
  };
}

async function confirmImageImport() {
  if (!state.imageImportRows.length) {
    toast('Chưa có dữ liệu ảnh để nhập', 'error');
    return;
  }

  const monthCache = {};
  let importedCount = 0;
  let skippedCount = 0;
  let overwrittenCount = 0;
  try {
    el.btnConfirmImageImport.classList.add('loading');

    for (const row of state.imageImportRows) {
      if (!row.amount) continue;
      if (!monthCache[row.month]) {
        monthCache[row.month] = await apiGet(`/api/records/${row.month}`);
      }

      const records = monthCache[row.month].quay_thuoc;
      const existingIndex = records.findIndex(item => item.ngay === row.ngay);
      const record = existingIndex >= 0 ? records[existingIndex] : buildEmptyRecord(row.ngay);
      if (Number(record[row.field]) > 0 && !row.overwrite) {
        skippedCount += 1;
        continue;
      }

      const wasOverwritten = Number(record[row.field]) > 0;
      record[row.field] = row.amount;

      await apiPost(`/api/records/${row.month}/quay_thuoc`, record);
      if (existingIndex >= 0) {
        records[existingIndex] = record;
      } else {
        records.push(record);
      }
      importedCount += 1;
      if (wasOverwritten) overwrittenCount += 1;
    }

    closeImageImportModal();
    clearImageImport();
    await loadMonth();
    const details = [
      `Đã nhập ${importedCount} ô`,
      overwrittenCount ? `ghi đè ${overwrittenCount} ô` : '',
      skippedCount ? `bỏ qua ${skippedCount} ô đã có dữ liệu` : ''
    ].filter(Boolean).join(', ');
    toast(`${details} từ ảnh`);
  } catch (error) {
    toast(error.message, 'error');
  } finally {
    el.btnConfirmImageImport.classList.remove('loading');
  }
}

function wireNumericInputs() {
  const nhInputs = ['inp_sang', 'inp_toi', 'inp_tien_ck', 'inp_tien_ck_thuoc', 'inp_tien_ck_dungcu', 'inp_tien_tra_hang'];
  nhInputs.forEach(id => {
    const input = $(id);
    if (!input) return;
    input.addEventListener('input', formatInputOnType);
    input.addEventListener('input', updatePreviewNh);
    input.addEventListener('input', updateDraftIndicator);
    input.addEventListener('input', scheduleAutosave);
    input.addEventListener('blur', flushAutosave);
  });
}

function wireEvents() {
  el.btnViewDesktop.addEventListener('click', () => saveViewMode('desktop'));
  el.btnViewMobile.addEventListener('click', () => saveViewMode('mobile'));
  el.btnPrevMonth.addEventListener('click', () => {
    saveCurrentFormToDraft();
    flushAutosave();
    state.drafts = {};
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
    flushAutosave();
    state.drafts = {};
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
  $('btnCloseModal').addEventListener('click', () => el.modalDelete.classList.add('hidden'));
  $('btnCancelDelete').addEventListener('click', () => el.modalDelete.classList.add('hidden'));
  $('btnConfirmDelete').addEventListener('click', handleDeleteConfirm);
  el.btnExport.addEventListener('click', () => {
    window.location.href = `/api/export/${monthKey()}`;
  });
  el.btnOpenImageImport.addEventListener('click', openImageImportModal);
  el.btnCloseImageImport.addEventListener('click', closeImageImportModal);
  el.btnClearImageImport.addEventListener('click', clearImageImport);
  el.btnConfirmImageImport.addEventListener('click', confirmImageImport);
  el.importEndDate.addEventListener('change', () => {
    rebuildImageImportRows().catch(error => toast(error.message, 'error'));
  });
  el.imageImportFiles.addEventListener('change', handleImageImportFileChange);
}

window.editNh = editNh;
window.confirmDelete = confirmDelete;

document.addEventListener('DOMContentLoaded', () => {
  saveViewMode(getInitialViewMode());
  updateMonthDisplay();
  updateSectionTitles();
  wireEvents();
  wireNumericInputs();
  loadMonth();
});
