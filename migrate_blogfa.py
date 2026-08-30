#!/usr/bin/env python3
"""
migrate_blogfa.py — turn saved BLOGFA post pages into Jekyll posts.

WHY THIS EXISTS
BLOGFA doesn't give a clean data export (no RSS-friendly full export, no
API), so the reliable way to pull your whole archive over is to save each
post's HTML page to disk, then run this script to turn them into the
_posts/YYYY-MM-DD-title.md files Jekyll (and the visual editor) expect.

HOW TO GET THE SOURCE FILES
1. Go to your BLOGFA archive/sitemap page (or your "Newer/Older" pagination)
   and open every post.
2. For each post, use your browser's "Save Page As... > Webpage, HTML only"
   (or Ctrl+S) and save it into a folder, e.g. ./blogfa_export/
   The filename doesn't matter, but keep the .html extension.
   (If you have dozens of posts, right-click > "Save Link As" from an
   archive listing page works too, or ask me for a browser-automation
   script instead — this version assumes manually saved pages, since
   BLOGFA is not reachable from here directly.)

USAGE
    pip install beautifulsoup4 python-dateutil --break-system-packages
    python3 migrate_blogfa.py ./blogfa_export ./_posts

WHAT IT DOES
- Reads each saved .html file
- Pulls the title (from <title> or first <h1>/<h2>)
- Pulls the post date/time if present in the page (edit PATTERNS below if
  your saved pages format dates differently)
- Pulls the main post body (best-effort: largest <div> containing text)
- Writes out a Jekyll-ready Markdown/HTML file with front matter

This is a best-effort script, not magic — always skim the generated files
in _posts/ afterward, since every BLOGFA theme structures the saved HTML
a little differently.
"""

import sys
import re
import os
from pathlib import Path
from datetime import datetime

try:
    from bs4 import BeautifulSoup
except ImportError:
    sys.exit("Missing dependency. Run: pip install beautifulsoup4 python-dateutil --break-system-packages")


def slugify(text: str) -> str:
    text = re.sub(r"[^\w\s-]", "", text, flags=re.UNICODE).strip().lower()
    text = re.sub(r"[\s_-]+", "-", text)
    return text[:60] or "post"


def find_date(soup: BeautifulSoup):
    """Look for a date in common BLOGFA markup patterns. Falls back to None."""
    for sel in [".post-meta", ".date", ".posted-on", "time"]:
        el = soup.select_one(sel)
        if el:
            text = el.get_text(" ", strip=True)
            m = re.search(r"(\d{4})[/-](\d{1,2})[/-](\d{1,2})", text)
            if m:
                y, mo, d = map(int, m.groups())
                try:
                    return datetime(y, mo, d, 12, 0)
                except ValueError:
                    pass
    return None


def find_title(soup: BeautifulSoup) -> str:
    for sel in ["h1", "h2", "title"]:
        el = soup.select_one(sel)
        if el and el.get_text(strip=True):
            return el.get_text(strip=True)
    return "Untitled Post"


def find_body(soup: BeautifulSoup) -> str:
    candidates = soup.select(".post, .post-content, article, #content, .entry")
    best = None
    best_len = 0
    for c in candidates:
        text_len = len(c.get_text(strip=True))
        if text_len > best_len:
            best = c
            best_len = text_len
    if best is None:
        best = soup.body or soup
    for tag in best.select("script, style, .comments-section, .post-meta, .post-action-row"):
        tag.decompose()
    return best.decode_contents().strip()


def convert_file(path: Path, out_dir: Path):
    html = path.read_text(encoding="utf-8", errors="ignore")
    soup = BeautifulSoup(html, "html.parser")

    title = find_title(soup)
    date = find_date(soup) or datetime.now()
    body = find_body(soup)

    slug = slugify(title)
    fname = f"{date:%Y-%m-%d}-{slug}.md"
    out_path = out_dir / fname

    front_matter = (
        "---\n"
        f'title: "{title}"\n'
        f"date: {date:%Y-%m-%d %H:%M:%S}\n"
        "tags: []\n"
        "---\n\n"
    )

    out_path.write_text(front_matter + body + "\n", encoding="utf-8")
    print(f"  -> {out_path.name}")


def main():
    if len(sys.argv) != 3:
        sys.exit("Usage: python3 migrate_blogfa.py <input_folder> <output_folder>")

    in_dir = Path(sys.argv[1])
    out_dir = Path(sys.argv[2])
    out_dir.mkdir(parents=True, exist_ok=True)

    html_files = sorted(in_dir.glob("*.html")) + sorted(in_dir.glob("*.htm"))
    if not html_files:
        sys.exit(f"No .html files found in {in_dir}")

    print(f"Converting {len(html_files)} saved BLOGFA pages...")
    for f in html_files:
        try:
            convert_file(f, out_dir)
        except Exception as e:
            print(f"  !! skipped {f.name}: {e}")

    print("\nDone. Check each file in", out_dir, "— fix titles/dates/tags where the script guessed wrong.")


if __name__ == "__main__":
    main()
