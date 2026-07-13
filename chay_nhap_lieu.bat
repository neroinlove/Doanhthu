@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Dang kiem tra Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo [LOI] Khong tim thay Python. Vui long cai Python truoc.
    pause
    exit /b 1
)
echo Dang kiem tra thu vien openpyxl...
python -c "import openpyxl" >nul 2>&1
if errorlevel 1 (
    echo Dang cai openpyxl...
    pip install openpyxl
)
echo.
python nhap_doanh_so.py
pause
