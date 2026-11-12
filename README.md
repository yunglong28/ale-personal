# Alessandro Y. Longo — personal site

Personal website of Alessandro Y. Longo: academic papers, writings, lectures and artworks.

Static HTML/CSS/JS, no build step.

## Structure

```
index.html            single page
assets/css/           styles
assets/js/            theme toggle, interactions, press/portrait canvases
assets/fonts/         webfonts
media/img/            images used by the page
favicon*, icon-512.png, apple-touch-icon.png
```

## Run locally

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

## Deploy

Served with GitHub Pages from the `main` branch root. Every push to `main` redeploys.
`.nojekyll` disables Jekyll processing so files are served as-is.

## What is in the repo

`.gitignore` is a whitelist: only the files the site actually loads are tracked.
Backups, drafts, source images, videos and documents stay local.

## Rights

Text, images and artworks © Alessandro Y. Longo, all rights reserved.
Fonts belong to their respective foundries and are included only to render this site
(Public Sans and Redaction under the SIL Open Font License; PP NeueBit and PP Mondwest by Pangram Pangram, under their web licence).
