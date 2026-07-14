"""
Dashboard Doanh Thu - Flask App
================================
Web app nhập và theo dõi doanh thu quầy thuốc + thuốc theo ngày/tháng.
"""

import json
import os
import re
import tempfile
from datetime import datetime
from calendar import monthrange
from flask import Flask, render_template, request, jsonify

app = Flask(__name__)

BASE_DIR  = os.path.dirname(os.path.abspath(__file__))
DATA_DIR  = os.path.join(BASE_DIR, 'data', 'records')
os.makedirs(DATA_DIR, exist_ok=True)

# ─── Helpers ────────────────────────────────────────────────────

def record_path(month: str) -> str:
    """month = 'YYYY-MM', e.g. '2025-07'"""
    return os.path.join(DATA_DIR, f"{month}.json")

def load_month(month: str) -> dict:
    path = record_path(month)
    if os.path.exists(path):
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    # Default empty structure
    return {
        "month": month,
        "quay_thuoc": [],   # list of daily records
        "thuoc":    []
    }

def save_month(month: str, data: dict):
    """Ghi JSON nguyên tử để tránh file dở dang nếu ứng dụng bị ngắt giữa lúc lưu."""
    target = record_path(month)
    fd, temp_path = tempfile.mkstemp(prefix=f".{month}-", suffix=".tmp", dir=DATA_DIR)
    try:
        with os.fdopen(fd, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            f.flush()
            os.fsync(f.fileno())
        os.replace(temp_path, target)
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

def safe_int(val, default=0) -> int:
    try:
        return int(str(val).replace(',', '').replace('.', '').strip())
    except (ValueError, TypeError):
        return default

def compute_tong_nh(rec: dict) -> int:
    return (safe_int(rec.get('sang'))
            + safe_int(rec.get('toi'))
            + safe_int(rec.get('tien_ck'))
            + safe_int(rec.get('tien_ck_thuoc'))
            + safe_int(rec.get('tien_ck_dungcu')))

def compute_tong_thuoc(rec: dict) -> int:
    return (safe_int(rec.get('ca1'))
            + safe_int(rec.get('ca2'))
            + safe_int(rec.get('ca3'))
            + safe_int(rec.get('ca4'))
            + safe_int(rec.get('ck')))

def summary_nh(records: list) -> dict:
    if not records:
        return {"tong_thang": 0, "tb_ngay": 0, "max_ngay": 0, "so_ngay": 0}
    tongs = [r.get('tong', 0) for r in records if r.get('tong', 0) > 0]
    return {
        "tong_thang": sum(tongs),
        "tb_ngay":    round(sum(tongs) / len(tongs)) if tongs else 0,
        "max_ngay":   max(tongs) if tongs else 0,
        "so_ngay":    len(tongs)
    }

def summary_thuoc(records: list) -> dict:
    if not records:
        return {"tong_thang": 0, "tb_ngay": 0, "max_ngay": 0, "so_ngay": 0}
    tongs = [r.get('tong', 0) for r in records if r.get('tong', 0) > 0]
    return {
        "tong_thang": sum(tongs),
        "tb_ngay":    round(sum(tongs) / len(tongs)) if tongs else 0,
        "max_ngay":   max(tongs) if tongs else 0,
        "so_ngay":    len(tongs)
    }

def list_available_months() -> list:
    """Trả về danh sách tháng đã có dữ liệu, sort mới nhất trước."""
    months = []
    for fname in os.listdir(DATA_DIR):
        if re.match(r'^\d{4}-\d{2}\.json$', fname):
            months.append(fname[:-5])
    return sorted(months, reverse=True)


# ─── Routes ─────────────────────────────────────────────────────

@app.route('/')
def dashboard():
    return render_template('dashboard.html')

@app.route('/report')
def report():
    return render_template('report.html')


# ─── API: Records ────────────────────────────────────────────────

@app.route('/api/records/<month>', methods=['GET'])
def get_records(month):
    """Lấy toàn bộ dữ liệu tháng."""
    if not re.match(r'^\d{4}-\d{2}$', month):
        return jsonify({'error': 'month phải có dạng YYYY-MM'}), 400
    data = load_month(month)
    return jsonify(data)


@app.route('/api/records/<month>/quay_thuoc', methods=['POST'])
def upsert_nh(month):
    """Thêm hoặc cập nhật 1 ngày quầy thuốc."""
    if not re.match(r'^\d{4}-\d{2}$', month):
        return jsonify({'error': 'month phải có dạng YYYY-MM'}), 400

    body = request.get_json(force=True)
    ngay = str(body.get('ngay', '')).strip()
    if not ngay:
        return jsonify({'error': 'Thiếu trường ngay'}), 400

    rec = {
        "ngay":           ngay,
        "sang":           safe_int(body.get('sang')),
        "toi":            safe_int(body.get('toi')),
        "tien_ck":        safe_int(body.get('tien_ck')),
        "tien_ck_thuoc":  safe_int(body.get('tien_ck_thuoc')),
        "tien_ck_dungcu": safe_int(body.get('tien_ck_dungcu')),
        "tien_tra_hang":  safe_int(body.get('tien_tra_hang')),
    }
    rec["tong"] = compute_tong_nh(rec)

    data = load_month(month)
    existing = next((i for i, r in enumerate(data['quay_thuoc']) if r['ngay'] == ngay), None)
    if existing is not None:
        data['quay_thuoc'][existing] = rec
    else:
        data['quay_thuoc'].append(rec)

    # Sort theo ngày
    def day_key(r):
        try: return float(r['ngay'].split('.')[0])
        except: return 0
    data['quay_thuoc'].sort(key=day_key)

    save_month(month, data)
    return jsonify({'message': 'OK', 'record': rec})


@app.route('/api/records/<month>/thuoc', methods=['POST'])
def upsert_thuoc(month):
    """Thêm hoặc cập nhật 1 ngày thuốc."""
    if not re.match(r'^\d{4}-\d{2}$', month):
        return jsonify({'error': 'month phải có dạng YYYY-MM'}), 400

    body = request.get_json(force=True)
    ngay = str(body.get('ngay', '')).strip()
    if not ngay:
        return jsonify({'error': 'Thiếu trường ngay'}), 400

    rec = {
        "ngay":     ngay,
        "ca1":      safe_int(body.get('ca1')),
        "ca2":      safe_int(body.get('ca2')),
        "ca3":      safe_int(body.get('ca3')),
        "ca4":      safe_int(body.get('ca4')),
        "ck":       safe_int(body.get('ck')),
        "tra_them": safe_int(body.get('tra_them')),
    }
    rec["tong"] = compute_tong_thuoc(rec)

    data = load_month(month)
    existing = next((i for i, r in enumerate(data['thuoc']) if r['ngay'] == ngay), None)
    if existing is not None:
        data['thuoc'][existing] = rec
    else:
        data['thuoc'].append(rec)

    def day_key(r):
        try: return float(r['ngay'].split('.')[0])
        except: return 0
    data['thuoc'].sort(key=day_key)

    save_month(month, data)
    return jsonify({'message': 'OK', 'record': rec})


@app.route('/api/records/<month>/<sheet_type>/<ngay>', methods=['DELETE'])
def delete_record(month, sheet_type, ngay):
    """Xóa 1 dòng ngày."""
    if sheet_type not in ('quay_thuoc', 'thuoc'):
        return jsonify({'error': 'sheet_type phải là quay_thuoc hoặc thuoc'}), 400
    data = load_month(month)
    before = len(data[sheet_type])
    data[sheet_type] = [r for r in data[sheet_type] if r['ngay'] != ngay]
    if len(data[sheet_type]) == before:
        return jsonify({'error': 'Không tìm thấy bản ghi'}), 404
    save_month(month, data)
    return jsonify({'message': f'Đã xóa ngày {ngay}'})


# ─── API: Summary ────────────────────────────────────────────────

@app.route('/api/summary/<month>')
def get_summary(month):
    """KPI tóm tắt tháng."""
    data = load_month(month)
    return jsonify({
        "month":    month,
        "quay_thuoc": summary_nh(data['quay_thuoc']),
        "thuoc":    summary_thuoc(data['thuoc'])
    })


@app.route('/api/months')
def get_months():
    """Danh sách tháng đã có dữ liệu."""
    return jsonify(list_available_months())


# ─── API: Export Excel ───────────────────────────────────────────

@app.route('/api/export/<month>')
def export_excel(month):
    """Xuất file Excel tháng."""
    try:
        import openpyxl
        from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
        from flask import send_file
        import io

        data = load_month(month)
        wb = openpyxl.Workbook()
        wb.remove(wb.active)

        thin = Side(style='thin', color='CCCCCC')
        border = Border(left=thin, right=thin, top=thin, bottom=thin)

        def hdr(cell, color="2563EB"):
            cell.font = Font(bold=True, color="FFFFFF", size=10)
            cell.fill = PatternFill("solid", fgColor=color)
            cell.alignment = Alignment(horizontal="center", vertical="center")
            cell.border = border

        def dat(cell):
            cell.alignment = Alignment(horizontal="center")
            cell.border = border

        # Sheet Quầy Thuốc
        ws1 = wb.create_sheet("Quầy Thuốc")
        nh_headers = ["Ngày", "Sáng", "Tối", "Tiền CK", "Tiền CK thuốc",
                      "Tiền CK dụng cụ", "Tiền trả hàng", "Tổng"]
        for ci, h in enumerate(nh_headers, 1):
            hdr(ws1.cell(1, ci, h))
        for ri, rec in enumerate(data['quay_thuoc'], 2):
            vals = [rec.get('ngay'), rec.get('sang'), rec.get('toi'),
                    rec.get('tien_ck'), rec.get('tien_ck_thuoc'),
                    rec.get('tien_ck_dungcu'), rec.get('tien_tra_hang'), rec.get('tong')]
            for ci, v in enumerate(vals, 1):
                dat(ws1.cell(ri, ci, v))
        col_widths_nh = [10, 12, 12, 12, 16, 18, 16, 14]
        for i, w in enumerate(col_widths_nh, 1):
            ws1.column_dimensions[openpyxl.utils.get_column_letter(i)].width = w

        # Sheet Thuốc
        ws2 = wb.create_sheet("Thuốc")
        th_headers = ["Ngày", "6h30-13h", "13h-17h", "17h-20h",
                      "20h-22h30", "CK", "Trả thêm", "Tổng"]
        for ci, h in enumerate(th_headers, 1):
            hdr(ws2.cell(1, ci, h), color="059669")
        for ri, rec in enumerate(data['thuoc'], 2):
            vals = [rec.get('ngay'), rec.get('ca1'), rec.get('ca2'),
                    rec.get('ca3'), rec.get('ca4'), rec.get('ck'),
                    rec.get('tra_them'), rec.get('tong')]
            for ci, v in enumerate(vals, 1):
                dat(ws2.cell(ri, ci, v))
        for i in range(1, 9):
            ws2.column_dimensions[openpyxl.utils.get_column_letter(i)].width = 12

        buf = io.BytesIO()
        wb.save(buf)
        buf.seek(0)
        filename = f"doanhthu_{month}.xlsx"
        return send_file(buf, as_attachment=True,
                         download_name=filename,
                         mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    except ImportError:
        return jsonify({'error': 'Cần cài openpyxl: pip install openpyxl'}), 500


# ─── API: Report data ────────────────────────────────────────────

@app.route('/api/report')
def report_data():
    """Dữ liệu cho trang báo cáo: 2 tháng gần nhất."""
    months = list_available_months()
    result = []
    for m in months[:6]:   # Trả về 6 tháng gần nhất
        data = load_month(m)
        sm_nh    = summary_nh(data['quay_thuoc'])
        sm_thuoc = summary_thuoc(data['thuoc'])
        result.append({
            "month":        m,
            "quay_thuoc":     sm_nh,
            "thuoc":        sm_thuoc,
            "tong_chung":   sm_nh['tong_thang'] + sm_thuoc['tong_thang'],
            "nh_days":      data['quay_thuoc'],
            "thuoc_days":   data['thuoc'],
        })
    return jsonify(result)


# ─── Entry point ─────────────────────────────────────────────────

if __name__ == '__main__':
    app.run(debug=True, port=5001, host='0.0.0.0')
