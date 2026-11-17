# Registra la tarea programada "CEPREMIX servidor": arranca el servidor de la oficina SIN
# NINGUNA VENTANA (pythonw.exe + servidor_oficina.pyw) cada vez que este usuario inicia
# sesión en Windows, y lo arranca ya mismo. Volver a ejecutarlo reemplaza la tarea anterior.
#
#   powershell -ExecutionPolicy Bypass -File scripts\instalar-inicio-automatico.ps1
#
# Para quitarlo:
#   Unregister-ScheduledTask -TaskName 'CEPREMIX servidor' -Confirm:$false
#   (y detener-servidor.ps1 para apagar el que esté corriendo)

$taskName = 'CEPREMIX servidor'
$launcher = Join-Path $PSScriptRoot 'servidor_oficina.pyw'
$minYtDlp = [version]'2026.10.26'

# Elegir un Python que tenga las dependencias y un yt-dlp reciente (uno viejo ya no
# consigue extraer el audio de YouTube).
$candidates = @(
    "$env:LOCALAPPDATA\Microsoft\WindowsApps\python.exe",
    (Get-Command python -ErrorAction SilentlyContinue).Source,
    (Join-Path (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)) '.venv\Scripts\python.exe')
) | Where-Object { $_ -and (Test-Path $_) } | Select-Object -Unique

$pythonw = $null
foreach ($py in $candidates) {
    $v = & $py -c "import fastapi, uvicorn, httpx, bcrypt, yt_dlp; print(yt_dlp.version.__version__)" 2>$null | Select-Object -Last 1
    $w = Join-Path (Split-Path $py) 'pythonw.exe'
    if ($v -and ([version]$v -ge $minYtDlp) -and (Test-Path $w)) { $pythonw = $w; break }
    Write-Output "Descartado $py (yt-dlp: $v)"
}
if (-not $pythonw) {
    throw "No encontré un Python con las dependencias y yt-dlp >= $minYtDlp. Ejecuta: python -m pip install -U ""yt-dlp[default]"" -r requirements.txt"
}

# Apagar la versión anterior (la que abría una ventana) antes de reemplazarla
Stop-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
& (Join-Path $PSScriptRoot 'detener-servidor.ps1') | Out-Null

$action = New-ScheduledTaskAction -Execute $pythonw -Argument "`"$launcher`"" `
    -WorkingDirectory (Split-Path -Parent $PSScriptRoot)
$trigger = New-ScheduledTaskTrigger -AtLogOn -User "$env:USERDOMAIN\$env:USERNAME"
$settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit ([TimeSpan]::Zero) `
    -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -MultipleInstances IgnoreNew

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings `
    -Description 'Servidor de musica CEPREMIX para el personal (http://<IP>:8000), sin ventana' -Force | Out-Null
Start-ScheduledTask -TaskName $taskName
Write-Output "Tarea '$taskName' registrada con $pythonw (sin ventana) y en marcha."
