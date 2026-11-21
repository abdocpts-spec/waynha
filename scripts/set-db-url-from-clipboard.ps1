# Writes DATABASE_URL into .env.production from the clipboard (copy the Neon connection string first).
# Prints only OK/error, never the password.
$ErrorActionPreference = "Stop"
$file = Join-Path (Split-Path $PSScriptRoot -Parent) ".env.production"
$u = (Get-Clipboard -Raw)
if (-not $u) { throw "Clipboard is empty. Copy the Neon connection string first." }
$u = $u.Trim().Trim('"').Trim("'")
$u = $u -replace '&channel_binding=require', '' -replace '\?channel_binding=require&', '?' -replace '\?channel_binding=require$', ''
if ($u -notmatch '^postgres(ql)?://[^:]+:[^@]+@[^/]+/[^?\s]+') { throw "Clipboard does not look like a postgres connection string." }
if ($u -match '\*{3,}') { throw "The password is hidden (stars). Click 'Show password' in Neon, then copy again." }
if ($u -match '-pooler') { Write-Warning "This is the POOLED url (has -pooler). For migrations use the DIRECT url (turn Connection pooling off)." }
$secret = ""
if (Test-Path $file) {
  $line = Get-Content $file | Where-Object { $_ -like 'NATIONAL_ID_SECRET=*' } | Select-Object -First 1
  if ($line) { $secret = $line }
}
if (-not $secret) { $secret = 'NATIONAL_ID_SECRET=""' }
Set-Content -Path $file -Value @("DATABASE_URL=`"$u`"", $secret) -Encoding UTF8
Write-Host "OK: DATABASE_URL saved to .env.production (length $($u.Length))."
