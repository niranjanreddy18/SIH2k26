# Script to configure PostgreSQL for SLIDMS
$ErrorActionPreference = "Stop"

$psqlPath = "C:\Program Files\PostgreSQL\bin\psql.exe"
$pgHbaPath = "C:\Program Files\PostgreSQL\data\pg_hba.conf"
$serviceName = "postgresql-x64-18"

Write-Host "=== SLIDMS PostgreSQL Configuration Setup ===" -ForegroundColor Cyan

# Check if PostgreSQL service is running
$svc = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
if (-not $svc) {
    # Check general postgres service names
    $svc = Get-Service *postgres* | Select-Object -First 1
}

if ($svc) {
    Write-Host "[+] Found PostgreSQL Service: $($svc.Name) (Status: $($svc.Status))" -ForegroundColor Green
} else {
    Write-Host "[-] PostgreSQL service not found." -ForegroundColor Red
}

# Test if postgres / postgres password already works
$env:PGPASSWORD = "postgres"
$testOutput = & $psqlPath -U postgres -h localhost -p 5432 -w -c "SELECT 1;" 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "[✓] Password 'postgres' is already active!" -ForegroundColor Green
    
    # Create slidms_db if not exists
    & $psqlPath -U postgres -h localhost -p 5432 -w -c "CREATE DATABASE slidms_db;" 2>&1 | Out-Null
    Write-Host "[✓] Database 'slidms_db' verified / created successfully." -ForegroundColor Green
    exit 0
}

Write-Host "[!] Current password for 'postgres' is not 'postgres'." -ForegroundColor Yellow
Write-Host "[!] Setting pg_hba.conf to trust mode temporarily to reset password..." -ForegroundColor Yellow

# Backup and modify pg_hba.conf to trust
$hbaContent = Get-Content $pgHbaPath -Raw
$newHba = $hbaContent -replace 'host\s+all\s+all\s+127\.0\.0\.1/32\s+scram-sha-256', 'host    all             all             127.0.0.1/32            trust'
$newHba = $newHba -replace 'host\s+all\s+all\s+::1/128\s+scram-sha-256', 'host    all             all             ::1/128                 trust'

Set-Content -Path $pgHbaPath -Value $newHba

Write-Host "[*] Updated pg_hba.conf." -ForegroundColor Cyan
Write-Host "[*] Restarting service '$($svc.Name)'..." -ForegroundColor Cyan

try {
    Restart-Service -Name $svc.Name
    Start-Sleep -Seconds 2

    # Now connect without password and reset password to postgres
    $env:PGPASSWORD = ""
    Write-Host "[*] Setting user 'postgres' password to 'postgres'..." -ForegroundColor Cyan
    & $psqlPath -U postgres -h localhost -p 5432 -c "ALTER USER postgres WITH PASSWORD 'postgres';"
    
    Write-Host "[*] Creating database 'slidms_db'..." -ForegroundColor Cyan
    & $psqlPath -U postgres -h localhost -p 5432 -c "CREATE DATABASE slidms_db;" 2>&1 | Out-Null

    # Revert pg_hba.conf to scram-sha-256
    Write-Host "[*] Restoring secure authentication in pg_hba.conf..." -ForegroundColor Cyan
    $secureHba = (Get-Content $pgHbaPath -Raw) -replace 'host\s+all\s+all\s+127\.0\.0\.1/32\s+trust', 'host    all             all             127.0.0.1/32            scram-sha-256'
    $secureHba = $secureHba -replace 'host\s+all\s+all\s+::1/128\s+trust', 'host    all             all             ::1/128                 scram-sha-256'
    Set-Content -Path $pgHbaPath -Value $secureHba

    Restart-Service -Name $svc.Name
    Start-Sleep -Seconds 2

    Write-Host "`n===============================================" -ForegroundColor Green
    Write-Host " [✓] SUCCESS! PostgreSQL is now configured with:" -ForegroundColor Green
    Write-Host "     DB_HOST=localhost" -ForegroundColor White
    Write-Host "     DB_PORT=5432" -ForegroundColor White
    Write-Host "     DB_USER=postgres" -ForegroundColor White
    Write-Host "     DB_PASSWORD=postgres" -ForegroundColor White
    Write-Host "     DB_NAME=slidms_db" -ForegroundColor White
    Write-Host "===============================================" -ForegroundColor Green
} catch {
    Write-Host "[-] Failed to restart service: $_" -ForegroundColor Red
    Write-Host "[!] Please run this script in PowerShell as Administrator:" -ForegroundColor Yellow
    Write-Host "    powershell -ExecutionPolicy Bypass -File .\scripts\setup_postgres.ps1" -ForegroundColor Yellow
}
