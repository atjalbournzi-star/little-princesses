@echo off
chcp 65001 > nul
echo ====================================================================
echo  👑 Little Princesses ERP - Sovereign Off-Project Daily Backup
echo  Destination: C:\Users\Mohammed Falah\ERP_Backups_Daily
echo ====================================================================

python "%~dp0backup_erp_daily.py"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo [SUCCESS] Backup finished cleanly with SHA-256 verification.
) else (
    echo.
    echo [ERROR] Backup process encountered an issue. Code: %ERRORLEVEL%
)

pause
