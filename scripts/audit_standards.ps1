# ==============================================================================
# scripts/audit_standards.ps1
# Architectural Standards & File Length Audit Tool | Little Princesses ERP
# Reference: PROJECT_STANDARDS.md
# ==============================================================================

param(
    [int]$MaxLines = 220,
    [string]$TargetDir = "src\features"
)

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host " Little Princesses ERP - Architecture & File Length Audit" -ForegroundColor Cyan
Write-Host " Standards Reference: PROJECT_STANDARDS.md (Max $MaxLines lines)" -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host ""

$overLimitFiles = @()
$passedFiles = @()
$totalFiles = 0

# 1. Strict File Length Limit Check
Write-Host "[1/3] Checking file line counts (Max: $MaxLines lines)..." -ForegroundColor Yellow

$featureFiles = Get-ChildItem -Path $TargetDir -Recurse -File -Include *.js, *.jsx | Where-Object {
    $_.FullName -notmatch "node_modules|\.min\.js|vendor|backups"
}

foreach ($file in $featureFiles) {
    $totalFiles++
    $relPath = $file.FullName.Replace((Get-Location).Path + "\", "")
    $lineCount = (Get-Content -Path $file.FullName | Measure-Object -Line).Lines

    if ($lineCount -gt $MaxLines) {
        $overLimitFiles += [PSCustomObject]@{
            Path = $relPath
            Lines = $lineCount
            Over = ($lineCount - $MaxLines)
        }
        Write-Host ("  [FAIL] {0,4} lines (+{1,3}) : {2}" -f $lineCount, ($lineCount - $MaxLines), $relPath) -ForegroundColor Red
    } else {
        $passedFiles += [PSCustomObject]@{
            Path = $relPath
            Lines = $lineCount
        }
    }
}

Write-Host ""
if ($overLimitFiles.Count -eq 0) {
    Write-Host "  [OK] All $totalFiles files in $TargetDir strictly adhere to the $MaxLines lines limit!" -ForegroundColor Green
} else {
    Write-Host "  [WARN] Found $($overLimitFiles.Count) files exceeding the $MaxLines lines ceiling." -ForegroundColor Magenta
}

Write-Host ""
# 2. Cache-Busting Check in index.html
Write-Host "[2/3] Checking index.html script tags for cache-busting (?v=...)..." -ForegroundColor Yellow

if (Test-Path "index.html") {
    $indexLines = Get-Content "index.html"
    $missingCacheBust = @()
    
    for ($i = 0; $i -lt $indexLines.Count; $i++) {
        $line = $indexLines[$i]
        if ($line -match '<script.*src="\./src/features/([^"]+)".*>' -and $line -notmatch '\?v=\d+') {
            $missingCacheBust += ("Line {0}: {1}" -f ($i + 1), $line.Trim())
        }
    }

    if ($missingCacheBust.Count -eq 0) {
        Write-Host "  [OK] All feature script tags in index.html contain ?v= cache-busting queries." -ForegroundColor Green
    } else {
        Write-Host "  [WARN] The following script tags are missing ?v= query:" -ForegroundColor Red
        $missingCacheBust | ForEach-Object { Write-Host "     $_" -ForegroundColor DarkYellow }
    }
} else {
    Write-Host "  [WARN] index.html not found." -ForegroundColor Red
}

Write-Host ""
# 3. Server Port 5000 Health Check
Write-Host "[3/3] Checking backend server responsiveness (Port 5000)..." -ForegroundColor Yellow
$port = 5000
try {
    $tcp = New-Object System.Net.Sockets.TcpClient
    $asyncResult = $tcp.BeginConnect("127.0.0.1", $port, $null, $null)
    $wait = $asyncResult.AsyncWaitHandle.WaitOne(1000, $false)
    if ($wait -and $tcp.Connected) {
        $tcp.EndConnect($asyncResult)
        $tcp.Close()
        Write-Host "  [OK] Backend server is ACTIVE and listening on port $port." -ForegroundColor Green
    } else {
        Write-Host "  [INFO] Port $port is not responding (Server is offline/idle)." -ForegroundColor DarkGray
    }
} catch {
    Write-Host "  [INFO] Unable to connect to port $port." -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host " Audit Summary:" -ForegroundColor Cyan
Write-Host "   - Total Files Checked : $totalFiles" -ForegroundColor White
Write-Host "   - Compliant Files     : $($passedFiles.Count)" -ForegroundColor Green
$overColor = if ($overLimitFiles.Count -eq 0) { 'Green' } else { 'Magenta' }
Write-Host "   - Over-Limit Files    : $($overLimitFiles.Count)" -ForegroundColor $overColor
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host ""
