from pathlib import Path
import tarfile, subprocess, os, hashlib

root = Path(r"D:\projects\setareganplus")
bundle = root / "deploy" / "guidance-dashboard-restore"
archive = root / "deploy" / "guidance-dashboard-restore.tar.gz"
files_dir = bundle / "files"

print("=== BUNDLE TREE ===")
for p in sorted(bundle.rglob("*")):
    if p.is_file():
        data = p.read_bytes()
        crlf = b"\r\n" in data
        cr = data.count(b"\r")
        print(f"{p.relative_to(bundle)}  bytes={p.stat().st_size}  crlf={crlf}  cr_count={cr}")

print("=== COPY_FILES.txt repr ===")
print(repr((bundle/"COPY_FILES.txt").read_text(encoding="utf-8")))

print("=== PACKED APP FILES ===")
for p in sorted(files_dir.rglob("*")):
    if p.is_file():
        print(p.relative_to(files_dir).as_posix())

print("=== TAR NAMES ===")
if archive.exists():
    print("archive", archive, "size", archive.stat().st_size)
    with tarfile.open(archive, "r:gz") as tar:
        names = tar.getnames()
    for n in names:
        print(n)
    roots = sorted({n.split("/")[0] for n in names if n})
    print("EXTRACT_ROOTS", roots)
else:
    print("ARCHIVE MISSING")

# bash -n if bash exists
sh = bundle / "apply-production.sh"
print("=== BASH -n ===")
try:
    r = subprocess.run(["bash", "-n", str(sh)], capture_output=True, text=True)
    print("exit", r.returncode)
    print(r.stdout)
    print(r.stderr)
except Exception as e:
    print("bash_unavailable", e)

print("=== APPLY SCRIPT CHECKS ===")
text = (bundle/"apply-production.sh").read_text(encoding="utf-8")
for needle in ["prisma migrate", "schema.prisma", "zibal", "middleware", ".env", "nginx", "ecosystem", "page.early", "pm2 restart", "tsc --noEmit", "npm run build", "NODE_OPTIONS", "backup_file", "setareganplus"]:
    print(needle, "->", needle in text or needle.lower() in text.lower())
