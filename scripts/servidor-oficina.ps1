# Arranca YA el servidor CEPREMIX de la oficina, sin ventana (igual que al iniciar sesión).
# El trabajo real lo hace servidor_oficina.pyw con pythonw.exe; este script solo lo lanza.
#
#   powershell -ExecutionPolicy Bypass -File scripts\servidor-oficina.ps1
#
# (Antes este script corría el servidor en una consola: en Windows 11 eso abría una ventana
#  de Terminal al encender la PC, y cerrarla apagaba el servidor.)

$task = Get-ScheduledTask -TaskName 'CEPREMIX servidor' -ErrorAction SilentlyContinue
if ($task -and $task.Actions[0].Execute -like '*pythonw.exe') {
    Start-ScheduledTask -TaskName 'CEPREMIX servidor'
    Write-Output 'Servidor arrancado (tarea programada, sin ventana).'
    return
}
# Sin la tarea nueva instalada: lanzar directamente con pythonw
$pythonw = Join-Path $env:LOCALAPPDATA 'Microsoft\WindowsApps\pythonw.exe'
Start-Process -FilePath $pythonw -ArgumentList "`"$(Join-Path $PSScriptRoot 'servidor_oficina.pyw')`"" `
    -WorkingDirectory (Split-Path -Parent $PSScriptRoot) -WindowStyle Hidden
Write-Output 'Servidor arrancado sin ventana.'
