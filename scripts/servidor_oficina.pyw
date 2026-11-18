"""
Lanzador SIN VENTANA del servidor CEPREMIX de la oficina: app + API en http://<IP>:8000

Se ejecuta con pythonw.exe (Python sin consola). Motivo: con python.exe o PowerShell,
Windows 11 abre una ventana de Windows Terminal al encender la PC aunque se pida "oculta",
y si alguien la cerraba, el servidor se apagaba.

- Si el servidor se cae, se reinicia solo a los 5 s.
- Si ya hay un servidor en el puerto 8000, no arranca otro.
- Mientras corre, la PC no se suspende (KEEP_AWAKE); la pantalla sí puede apagarse.
- Registro en logs/servidor.log (se rota al pasar de 5 MB).

Lo arranca la tarea programada "CEPREMIX servidor" (instalar-inicio-automatico.ps1).
Para arrancarlo/detenerlo a mano: iniciar-servidor.ps1 / detener-servidor.ps1.
"""
import datetime
import os
import socket
import subprocess
import sys
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # music-app-fastapi
LOG_DIR = os.path.join(ROOT, "logs")
LOG = os.path.join(LOG_DIR, "servidor.log")
PORT = 8000
CREATE_NO_WINDOW = 0x08000000  # proceso de consola, pero sin ventana

ENV = {
    **os.environ,
    "HOST": "0.0.0.0",  # escuchar en la red de la oficina
    "PORT": str(PORT),
    "AUDIO_PROXY": "on",  # IP de oficina: YouTube sí deja extraer el audio
    "KEEP_AWAKE": "1",
    # Cloudflare Access: crear salas desde internet exige el código por correo (ruta /acceso/*)
    "CF_ACCESS_TEAM": "bold-dawn-12c7",
    "PYTHONUNBUFFERED": "1",
    "PYTHONIOENCODING": "utf-8",
    # "REGISTRATION_CODE": "cambia-esto",  # opcional: exigir un código para crear cuentas
    # "AUDIO_CACHE_MAX_MB": "4000",        # tamaño máximo de la cache de canciones
}


def log(msg: str) -> None:
    with open(LOG, "a", encoding="utf-8") as f:
        f.write(f"[{datetime.datetime.now():%Y-%m-%dT%H:%M:%S}] {msg}\n")


def port_in_use() -> bool:
    try:
        with socket.create_connection(("127.0.0.1", PORT), timeout=1):
            return True
    except OSError:
        return False


def server_python() -> str:
    """python.exe junto a este pythonw.exe (mismo intérprete y paquetes)."""
    exe = sys.executable
    candidate = os.path.join(os.path.dirname(exe), "python.exe")
    return candidate if os.path.isfile(candidate) else exe


def main() -> None:
    os.makedirs(LOG_DIR, exist_ok=True)
    if port_in_use():
        log("Ya hay un servidor en el puerto 8000; este lanzador no arranca otro.")
        return
    python = server_python()
    while True:
        if os.path.isfile(LOG) and os.path.getsize(LOG) > 5 * 1024 * 1024:
            os.replace(LOG, LOG + ".1")
        log(f"Iniciando servidor CEPREMIX ({python})...")
        with open(LOG, "ab") as out:
            code = subprocess.call(
                [python, "main.py"],
                cwd=ROOT,
                env=ENV,
                stdin=subprocess.DEVNULL,
                stdout=out,
                stderr=subprocess.STDOUT,
                creationflags=CREATE_NO_WINDOW,
            )
        log(f"El servidor se detuvo (codigo {code}). Reinicio en 5 s.")
        time.sleep(5)
        if port_in_use():  # alguien arrancó otro servidor mientras tanto
            log("Otro servidor ocupa el puerto 8000; este lanzador termina.")
            return


if __name__ == "__main__":
    main()
