"""Serve the built four-direction comparison at the Oparax review address."""
from pathlib import Path
import argparse
import shutil
import socket
import subprocess

parser = argparse.ArgumentParser(description="Serve the four-direction component demonstration.")
parser.add_argument("--port", type=int, default=3000)
args = parser.parse_args()
root = Path(__file__).resolve().parent
site = root / "site"
with socket.socket() as probe:
    busy = probe.connect_ex(("127.0.0.1", args.port)) == 0
if busy:
    raise SystemExit(f"Port {args.port} is occupied. Identify and stop the Oparax server before starting the comparison on port 3000. Do not automatically choose another port.")
else:
    node = shutil.which("node")
    next_cli = site / "node_modules/next/dist/bin/next"
    if not node or not next_cli.exists():
        raise SystemExit("The existing Node runtime or preview dependencies are unavailable.")
    if not (site / "build/BUILD_ID").exists():
        raise SystemExit("Build the comparison first with pnpm build in scratch/design-recovery/site.")
    with (root / "server.log").open("a") as log:
        process = subprocess.Popen(
            [node, str(next_cli), "start", str(site), "--port", str(args.port), "--hostname", "127.0.0.1"],
            cwd=site, stdin=subprocess.DEVNULL, stdout=log, stderr=log,
            start_new_session=True,
        )
    (root / "server.pid").write_text(str(process.pid))
    print(f"Preview starting at http://localhost:{args.port}/. See server.log for readiness.")
