#!/usr/bin/env python3
"""
Switch ONLY the nginx server blocks for <domain> / www.<domain> from the old
Next.js port to the new one. Other vhosts (shop., academy., ...) are untouched.

  nginx_switch.py detect --domain setareganplus.ir
      -> prints the old port proxied by the apex block (or nothing)
  nginx_switch.py switch --domain D --old 3000 --new 3100 --backup-dir DIR [--dry-run]
      -> edits files in place, writes DIR/manifest.tsv (orig_path, backup_file, sha256_after)

Python 3.6+, stdlib only.
"""
import argparse, hashlib, os, re, shutil, subprocess, sys

LOCAL = r"(?:127\.0\.0\.1|localhost|0\.0\.0\.0|\[::1\])"


def config_files():
    """All files nginx actually loads (from `nginx -T`)."""
    out = subprocess.run(["nginx", "-T"], stdout=subprocess.PIPE, stderr=subprocess.STDOUT, universal_newlines=True).stdout
    files = []
    for line in out.splitlines():
        m = re.match(r"# configuration file (.+):$", line.strip())
        if m:
            p = os.path.realpath(m.group(1))
            if p not in files and os.path.isfile(p):
                files.append(p)
    return files


def mask(text):
    """Same-length copy with comments and quoted strings blanked, for safe brace matching."""
    out, i, n = list(text), 0, len(text)
    while i < n:
        c = text[i]
        if c == "#":
            while i < n and text[i] != "\n":
                out[i] = " "; i += 1
        elif c in "\"'":
            q = c; i += 1
            while i < n and text[i] != q:
                if text[i] == "\\": out[i] = " "; i += 1
                if i < n and text[i] != "\n": out[i] = " "
                i += 1
            i += 1
        else:
            i += 1
    return "".join(out)


def blocks(text, keyword):
    """Yield (start, end) spans of `keyword ... { ... }` blocks (end exclusive)."""
    m_text = mask(text)
    for m in re.finditer(r"(?<![\w$])" + keyword + r"\b[^{;]*\{", m_text):
        depth, j = 0, m.end() - 1
        while j < len(m_text):
            if m_text[j] == "{": depth += 1
            elif m_text[j] == "}":
                depth -= 1
                if depth == 0:
                    yield m.start(), j + 1
                    break
            j += 1


def server_names(block):
    names = []
    for m in re.finditer(r"(?<![\w$])server_name\s+([^;]+);", mask(block)):
        names += m.group(1).split()
    return names


def upstreams_with_port(files, port):
    names = set()
    for f in files:
        t = open(f, encoding="utf-8", errors="surrogateescape").read()
        for s, e in blocks(t, "upstream"):
            b = t[s:e]
            name = re.match(r"upstream\s+(\S+)", b).group(1)
            if re.search(r"server\s+" + LOCAL + ":" + str(port) + r"\b", mask(b)):
                names.add(name)
    return names


def target_blocks(text, domain):
    want = {domain, "www." + domain}
    for s, e in blocks(text, "server"):
        if want & set(server_names(text[s:e])):
            yield s, e


def detect(domain):
    ports = []
    for f in config_files():
        t = open(f, encoding="utf-8", errors="surrogateescape").read()
        for s, e in target_blocks(t, domain):
            for m in re.finditer(r"proxy_pass\s+https?://" + LOCAL + r":(\d+)", mask(t[s:e])):
                ports.append(m.group(1))
    if ports:
        print(max(set(ports), key=ports.count))


def switch(domain, old, new, backup_dir, dry):
    files = config_files()
    ups = upstreams_with_port(files, old)
    pp_local = re.compile(r"proxy_pass\s+https?://" + LOCAL + ":" + str(old) + r"(?:/[^;\s]*)?\s*;")
    pp_up = re.compile(r"proxy_pass\s+https?://(" + "|".join(map(re.escape, ups)) + r")(?:/[^;\s]*)?\s*;") if ups else None
    old_next = re.compile(r"/var/www/setareganplus/\.next\b")
    manifest, warnings, changes = [], [], 0
    for f in files:
        text = open(f, encoding="utf-8", errors="surrogateescape").read()
        spans = list(target_blocks(text, domain))
        if not spans:
            continue
        new_text, last, file_changes = [], 0, 0
        for s, e in spans:
            blk = text[s:e]
            nb, c1 = pp_local.subn("proxy_pass http://127.0.0.1:%d;" % new, blk)
            c2 = 0
            if pp_up:
                nb, c2 = pp_up.subn("proxy_pass http://127.0.0.1:%d;" % new, nb)
            nb, c3 = old_next.subn("/var/www/setareganplus-lean/.next", nb)
            if c1 + c2 > 0 and not re.search(r"client_max_body_size", mask(nb)):
                nb = re.sub(r"(server_name[^;]*;)", r"\1\n    client_max_body_size 60m;  # setareganplus-lean uploads", nb, count=1)
            for m in re.finditer(r"(?:alias|root)\s+(/var/www/setareganplus/[^;]*);", mask(nb)):
                warnings.append("%s: still serves files from old app path %s" % (f, m.group(1).strip()))
            for m in re.finditer(r"return\s+30[1278]\s+[^;]*;", mask(nb)):
                if m.group(0).rstrip(";").endswith("$request_uri"):
                    continue  # plain http->https / www->apex redirect
                warnings.append("%s: redirect rule kept, check it still makes sense: %s" % (f, m.group(0)))
            new_text.append(text[last:s]); new_text.append(nb); last = e
            file_changes += c1 + c2 + c3
        new_text.append(text[last:])
        out = "".join(new_text)
        if file_changes and out != text:
            changes += file_changes
            bk = os.path.join(backup_dir, f.strip("/").replace("/", "__"))
            if not dry:
                os.makedirs(backup_dir, exist_ok=True)
                shutil.copy2(f, bk)
                with open(f, "w", encoding="utf-8", errors="surrogateescape") as fh:
                    fh.write(out)
            manifest.append((f, bk, hashlib.sha256(out.encode("utf-8", "surrogateescape")).hexdigest()))
            print("changed %d directive(s) in %s" % (file_changes, f))
    if manifest and not dry:
        with open(os.path.join(backup_dir, "manifest.tsv"), "w") as fh:
            for row in manifest:
                fh.write("\t".join(row) + "\n")
    for w in warnings:
        print("WARN " + w)
    print("TOTAL_CHANGES=%d" % changes)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=["detect", "switch"])
    ap.add_argument("--domain", required=True)
    ap.add_argument("--old", type=int)
    ap.add_argument("--new", type=int)
    ap.add_argument("--backup-dir")
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()
    if a.cmd == "detect":
        detect(a.domain)
    else:
        if not (a.old and a.new and a.backup_dir):
            sys.exit("switch needs --old --new --backup-dir")
        switch(a.domain, a.old, a.new, a.backup_dir, a.dry_run)
