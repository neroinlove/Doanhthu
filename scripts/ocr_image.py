"""OCR ảnh cho Linux: cùng định dạng JSON với scripts/ocr_image.swift (Vision của macOS).

Mỗi dòng: text, confidence, x, y, width, height. Toạ độ chuẩn hoá 0..1, gốc ở góc dưới
bên trái (giống Vision), để parse_ocr_lines trong app.py dùng chung cho cả hai nền tảng.
"""
import json
import sys

import cv2
from rapidocr_onnxruntime import RapidOCR


def main() -> int:
    if len(sys.argv) < 2:
        sys.stderr.write("Missing image path\n")
        return 1
    image = cv2.imread(sys.argv[1])
    if image is None:
        sys.stderr.write("Cannot read image\n")
        return 1
    height, width = image.shape[:2]
    result, _ = RapidOCR()(image)
    lines = []
    for box, text, score in result or []:
        xs = [point[0] for point in box]
        ys = [point[1] for point in box]
        lines.append({
            "text": text,
            "confidence": float(score),
            "x": min(xs) / width,
            "y": 1 - max(ys) / height,
            "width": (max(xs) - min(xs)) / width,
            "height": (max(ys) - min(ys)) / height,
        })
    sys.stdout.write(json.dumps(lines))
    return 0


if __name__ == "__main__":
    sys.exit(main())
