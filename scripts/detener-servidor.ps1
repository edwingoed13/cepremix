# Apaga el servidor CEPREMIX de la oficina (el lanzador sin ventana y el propio servidor).
# Como ya no hay ventana que cerrar, este es el modo de apagarlo a mano.
#
#   powershell -ExecutionPolicy Bypass -File scripts\detener-servidor.ps1

$stopped = 0

# 1) El lanzador primero, para que no vuelva a arrancar el servidor
Get-CimInstance Win32_Process -Filter "Name LIKE 'python%'" |
    Where-Object { $_.CommandLine -like '*servidor_oficina.pyw*' } |
    ForEach-Object {
        Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
        Write-Output "Detenido el lanzador ($($_.ProcessId))"
        $stopped++
    }

# 2) El servidor: el proceso Python que escucha en el puerto 8000 con main.py
$conn = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if ($conn) {
    $p = Get-CimInstance Win32_Process -Filter "ProcessId=$($conn.OwningProcess)"
    if ($p.Name -like 'python*' -and $p.CommandLine -like '*main.py*') {
        Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue
        Write-Output "Detenido el servidor ($($p.ProcessId))"
        $stopped++
    } else {
        Write-Output "El puerto 8000 lo usa otro programa ($($p.Name)); no lo toco."
    }
}

if (-not $stopped) { Write-Output 'No había ningún servidor CEPREMIX corriendo.' }
