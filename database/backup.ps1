# ============================================================================
#  SafeGuard — Database backup script (Windows / PowerShell)
#  Usage:  ./backup.ps1
#  Produces a timestamped .sql dump in ./backups
# ============================================================================
param(
    [string]$DbName = "fems",
    [string]$DbUser = "postgres",
    [string]$DbHost = "localhost",
    [int]   $DbPort = 5432
)

$ErrorActionPreference = "Stop"
$stamp   = Get-Date -Format "yyyyMMdd_HHmmss"
$outDir  = Join-Path $PSScriptRoot "backups"
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }
$outFile = Join-Path $outDir "fems_backup_$stamp.sql"

Write-Host "Backing up '$DbName' to $outFile ..."
& pg_dump --host=$DbHost --port=$DbPort --username=$DbUser --no-owner --no-privileges --file=$outFile $DbName
Write-Host "Done. Backup saved to $outFile"

# Restore with:
#   psql -U postgres -d fems -f fems_backup_<stamp>.sql
