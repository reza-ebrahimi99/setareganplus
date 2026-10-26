#!/usr/bin/env python3
"""
Close the OLD shop subdomain (shop.setareganplus.ir) at the nginx level.

For every nginx server block whose server_name contains exactly
shop.setareganplus.ir, insert (right after `server {`) server-level rewrites:

  /admin, /admin/...            -> 302 https://setareganplus.ir/admin
  /book/<known slug>            -> 301 https://setareganplus.ir/shop/<slug>
  everything else               -> 301 https://setareganplus.ir/shop
  /.well-known/acme-challenge/  -> untouched (certbot renewals keep working)

Server-level rewrites run before location matching, so the existing
proxy_pass config is left in place (and comes back with --undo) without
having to delete or rewrite it. Nothing else is touched: other hosts, the
old app on :3000 and its data all stay as they are.

  close_old_shop.py apply --sites DIR --backup DIR   -> edits, prints changed files
  close_old_shop.py check --sites DIR                -> prints matching files

Python 3.6+, stdlib only. Idempotent: blocks with the marker are skipped.
"""
import argparse, os, re, shutil, sys

HOST = "shop.setareganplus.ir"
ALLOWED_NAMES = {HOST, "www." + HOST}
MARK_BEGIN = "# >>> sp-close-old-shop (deploy/lean/close-old-shop.sh) >>>"
MARK_END = "# <<< sp-close-old-shop <<<"

# old /book/<slug> -> new /shop/<slug>; every slug the old shop links to is on the new shop
SLUGS = ["Jozve_zist12", "arabi", "fizik10", "fizik11", "fizik122", "hooshkalami",
         "hooshmanteghi", "hooshriazi", "jozve_olomfonon", "jozve_zist", "jozveolomfonon12",
         "riazi11", "riazi12", "riazi12e", "shimi10", "shimi11", "shimi12"]


def snippet(indent):
    lines = [
        MARK_BEGIN,
        "# old shop closed: admin -> new admin, everything else -> new /shop (ACME stays open)",
        "rewrite ^/admin(?:/.*)?$ https://setareganplus.ir/admin? redirect;",
        "rewrite ^/book/(%s)/?$ https://setareganplus.ir/shop/$1? permanent;" % "|".join(SLUGS),
        "rewrite ^/(?!\\.well-known/acme-challenge/) https://setareganplus.ir/shop? permanent;",
        MARK_END,
    ]
    return "".join(indent + l + "\n" for l in lines)


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
                if text[i] == "\\":
                    out[i] = " "; i += 1
                if i < n and text[i] != "\n":
                    out[i] = " "
                i += 1
            i += 1
        else:
            i += 1
    return "".join(out)


def server_blocks(text):
    """Yield (open_brace_index, end_index_exclusive) of top-level-ish `server {` blocks."""
    m = mask(text)
    for hit in re.finditer(r"(?<![\w$.-])server\s*\{", m):
        ob = hit.end() - 1
        depth, j = 0, ob
        while j < len(m):
            if m[j] == "{":
                depth += 1
            elif m[j] == "}":
                depth -= 1
                if depth == 0:
                    yield ob, j + 1
                    break
            j += 1


def names_in(block_masked):
    """server_name values of THIS block (ignore nested blocks)."""
    names = []
    depth = 0
    flat = []
    for ch in block_masked[1:-1]:  # strip outer braces
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
        elif depth == 0:
            flat.append(ch)
    for sm in re.finditer(r"(?<![\w$.-])server_name\s+([^;]+);", "".join(flat)):
        names += sm.group(1).split()
    return [n.lower() for n in names]


def plan(text):
    """Return list of (insert_at, indent, names, already_marked) for matching blocks."""
    m = mask(text)
    res = []
    for ob, end in server_blocks(text):
        names = names_in(m[ob:end])
        if HOST not in names:
            continue
        marked = MARK_BEGIN in text[ob:end]
        nl = text.find("\n", ob)
        insert_at = (nl + 1) if 0 <= nl < end else ob + 1
        # indentation of the first directive inside the block, default 4 spaces
        nxt = re.match(r"[ \t]*", text[insert_at:end])
        indent = nxt.group(0) if nxt and nxt.group(0) else "    "
        res.append((insert_at, indent, names, marked))
    return res


def candidate_files(sites):
    seen, out = set(), []
    for f in sorted(os.listdir(sites)):
        p = os.path.join(sites, f)
        real = os.path.realpath(p)
        if not os.path.isfile(real) or real in seen:
            continue
        seen.add(real)
        try:
            with open(real, encoding="utf-8", errors="surrogateescape") as fh:
                text = fh.read()
        except OSError:
            continue
        if plan(text):
            out.append((p, real, text))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=["apply", "check"])
    ap.add_argument("--sites", default="/etc/nginx/sites-enabled")
    ap.add_argument("--backup")
    a = ap.parse_args()

    files = candidate_files(a.sites)
    if not files:
        print("NOFILE", file=sys.stderr)
        return 3
    # refuse shared blocks: rewriting them would also close unrelated hosts
    for p, real, text in files:
        for _, _, names, _ in plan(text):
            extra = [n for n in names if n not in ALLOWED_NAMES]
            if extra:
                print("SHARED %s %s" % (real, " ".join(extra)), file=sys.stderr)
                return 4
    if a.cmd == "check":
        for p, real, text in files:
            print(real)
        return 0

    if not a.backup:
        ap.error("--backup is required for apply")
    os.makedirs(a.backup, exist_ok=True)
    manifest = []
    changed = 0
    for idx, (p, real, text) in enumerate(files):
        todo = [x for x in plan(text) if not x[3]]
        if not todo:
            print("SKIP %s" % real)
            continue
        bk = os.path.join(a.backup, "%02d-%s" % (idx, os.path.basename(real)))
        shutil.copy2(real, bk)
        manifest.append("%s\t%s" % (real, bk))
        new = text
        for insert_at, indent, _, _ in sorted(todo, key=lambda x: -x[0]):
            new = new[:insert_at] + snippet(indent) + new[insert_at:]
        with open(real, "w", encoding="utf-8", errors="surrogateescape") as fh:
            fh.write(new)
        changed += 1
        print("EDIT %s (%d server block%s)" % (real, len(todo), "" if len(todo) == 1 else "s"))
    if manifest:
        with open(os.path.join(a.backup, "manifest.tsv"), "w") as fh:
            fh.write("\n".join(manifest) + "\n")
    return 0 if changed else 10


if __name__ == "__main__":
    sys.exit(main())
