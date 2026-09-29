# Maede Khademi — Portfolio Site

A static, interactive recreation of the Figma portfolio prototype. No build step — just HTML/CSS/JS.

## Run it locally

Open `index.html` directly in a browser, or serve it (recommended, so relative paths/JS all work):

```bash
cd portfolio-site
python3 -m http.server 8080
```

Then visit http://localhost:8080

## What's interactive

- Sticky **Home / CV / Contact** pill nav that highlights the section you're viewing and smooth-scrolls on click
- Floating **Mail** button (bottom-left) — opens your email client
- **Featured projects** cards with hover lift
- **Tools** progress bars animate in when scrolled into view
- **Landing pages** and **SolidWorks** carousels (prev/next arrows — wired to support multiple slides if you add more)
- **Experience** cards expand/collapse a responsibilities list on click

## Images

Every visual is currently a placeholder — colored gradients standing in for your real photos/mockups. Send over the images and I'll wire them in, or do it yourself:

1. Export each image/frame from Figma (select it → **Export**, PNG or WebP, 2x) and drop the files into `images/`.
2. Swap these placeholder elements in `index.html` for `<img>` tags:
   - Hero: 3 circular badges (`.badge--photo`) — your portrait, a workshop photo, a Netherlands photo
   - Featured projects: 5 thumbnails (`.thumb--dashboard`, `.thumb--ski`, `.thumb--tinyrocket`, `.thumb--plantb`, `.thumb--breathe`)
   - About me: `.about-card__photo`
   - Landing pages: `.thumb--boba`
   - SolidWorks: `.thumb--solidworks`
3. Delete the matching gradient rule in `styles.css` once you've swapped in a real `<img>`.

## Deploying

Any static host works, e.g. GitHub Pages, Netlify, or Vercel — just drag the `portfolio-site` folder in, no build step needed.
