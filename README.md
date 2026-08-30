# MAHOU ARCHIVE — GitHub Pages migration kit

This turns your BLOGFA template into a **Jekyll** site (GitHub Pages'
built-in blog engine) plus a **visual post editor** in the browser, so
writing posts stays as easy as it was on BLOGFA.

## What's in here

```
_config.yml          site settings (title, URL, permalinks, pagination)
_layouts/
  default.html        page shell: header, search bar, sidebar, footer
  post.html            single-post view (comments, likes, tags)
index.html             home page — lists posts, paginated
archive.html            full archive grouped by month
tags.html                browse posts by tag
_includes/
  head-extra.html      <head> tags, fonts, schema.org markup
  sidebar.html          About / tags / playlists / archive panel
assets/
  css/style.css          all your original design, unchanged
  js/main.js              search, comments, likes, playlist player (Supabase)
_posts/                  your posts live here, one file per post
admin/
  index.html              the visual post editor (Decap CMS)
  config.yml               editor configuration
tools/
  migrate_blogfa.py        script to bulk-import your BLOGFA archive
```

## 1. Get it on GitHub Pages

1. Create a new GitHub repo, e.g. `mahou-archive`.
2. Upload everything in this folder to the repo (keep the folder structure).
3. In the repo, go to **Settings > Pages**, set source to the `main`
   branch, root folder. GitHub will build the Jekyll site automatically —
   no build step for you to run.
4. Open `_config.yml` and replace `YOURUSERNAME` with your GitHub username
   (and set `url`/`baseurl` to match your Pages URL, or your custom domain
   if you attach one).
5. Your site will be live at `https://YOURUSERNAME.github.io/mahou-archive/`
   within a minute or two of the first push.

## 2. Writing posts

**Option A — the visual editor (recommended, feels like BLOGFA):**
Go to `https://YOURUSERNAME.github.io/mahou-archive/admin/`. This is
[Decap CMS](https://decapcms.org) — bold/italic/heading/list/image buttons,
a live preview, and a "Publish" button. It writes the post file straight
into your `_posts/` folder as a commit.

**Setting up the visual editor login:**
GitHub Pages can't run a login server itself, so the editor needs a small
free "OAuth helper" to handle the GitHub sign-in popup. The fastest path:

1. Deploy this ready-made helper to Cloudflare Pages (free tier, ~5 min):
   https://github.com/sterlingwes/netlify-cms-oauth-provider-vercel — or
   search "decap cms github oauth provider" for current community options,
   since which host is easiest changes over time.
2. Register a GitHub OAuth App at
   `https://github.com/settings/developers` pointing its callback URL at
   the helper you deployed.
3. Put the helper's URL into `admin/config.yml` as `base_url`.

Once that's done, `/admin` logs in with your GitHub account and every post
you publish there becomes a real commit to your repo — full history, no
separate database.

**Option B — write a file by hand:**
Add a file to `_posts/` named `YYYY-MM-DD-your-title.md`:

```markdown
---
title: "Post title here"
date: 2026-08-29 14:30:00
tags: [manga, yuri]
---

Your post content, in Markdown or plain HTML.
```

Commit it (via GitHub's web "Add file" button, GitHub Desktop, or git) and
it appears on the site automatically — no rebuild step needed.

## 3. Moving your BLOGFA archive over

BLOGFA has no clean export/API, so the reliable way is:

1. Open each post on your live BLOGFA blog and **Save Page As > Webpage,
   HTML only** into a folder, e.g. `blogfa_export/`.
2. Run the migration script:
   ```
   pip install beautifulsoup4 python-dateutil --break-system-packages
   python3 tools/migrate_blogfa.py ./blogfa_export ./_posts
   ```
3. It'll generate one `_posts/YYYY-MM-DD-title.md` file per saved page,
   with title/date/body pulled out automatically. **Skim each one
   afterward** — BLOGFA's saved HTML varies a bit page to page, so titles,
   dates, or stray sidebar text occasionally need a manual tidy-up.
4. Commit the new files in `_posts/` and push — your whole archive appears
   on the new site, oldest-to-newest, with working pagination and archive
   listing automatically.

If you have a *lot* of posts and saving each one by hand is too tedious,
tell me and I can write a version of the script that also handles fetching
directly from your BLOGFA archive listing pages, given the export folder
or a way to reach the blog's HTML.

## 4. nekoweb

nekoweb has no build step, so it can't run Jekyll or `/admin` directly.
If you still want a presence there, the practical route is: keep GitHub
Pages as the "real" site with the post editor, and periodically copy the
built HTML output over to nekoweb as a static mirror (Jekyll can build
locally with `bundle exec jekyll build`, producing a `_site/` folder you
just upload). Say the word if you want that build step scripted out too.

## 5. What stayed the same

- All your original CSS (`assets/css/style.css`) — same fonts, same
  neo-brutalist card style, same everything.
- The Supabase-backed comments, likes, and view counters — untouched,
  since they were already talking to Supabase directly and don't care
  what platform hosts the HTML.
- The playlist / mini-player system in `assets/js/main.js`.
- The manga-reader page template (`_layouts` doesn't include it yet since
  it's a standalone page rather than a post type — let me know if you
  want it wired in as a Jekyll page/collection too).
