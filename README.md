# WebGL Glass Carousel

An infinite, scroll-driven portfolio carousel rendered with **three.js**, animated with **GSAP**, and finished with a liquid-glass lens shader — chromatic dispersion, a shimmering ring and a fluid rim, all as a single fullscreen post-process.

Built with Next.js (App Router), but the carousel core is plain JavaScript with no framework dependency.

## Features

- **Infinite row** — panels wrap seamlessly in both directions; each panel keeps its image's natural aspect ratio (no crop, no stretch).
- **Premium scroll** — free scrolling with a weighty lerp glide; when the glide is about to settle, it lands softly on the nearest panel center (settle snap) in one continuous motion.
- **Liquid-glass lens** — the row renders into a framebuffer and is drawn through a refraction shader: inward pull, chromatic dispersion, white nova core, blue shimmer ring, fluid rim wave.
- **Focus mode** — click any panel: the carousel centers it, every other panel drops away in a center-out stagger, the lens distortion melts out and the image enlarges.
- **Entry animation** — panels rise from below at a small size, then bloom to full size while the lens fades in.
- **Speed shrink** — panels compress slightly at high scroll speed for a sense of drag.
- **Live tuning** — every constant is editable at runtime through a hidden [lil-gui](https://lil-gui.georgealways.com/) panel.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project structure

```
app/                          Next.js app (page just renders the component)
Components/
  CarouselSection.jsx         React wrapper — overlay UI only (heading,
                              counter, "View" cursor, Close button)
lib/carousel/
  config.js                   ← the image list + every tunable. Start here.
  engine.js                   the core: scene, infinite row, scroll model,
                              lens shader, focus mode, entry animation
  gui.js                      optional lil-gui dev panel
public/                       carousel images
```

### Add your own images

1. Drop images into `public/`.
2. Edit the `PROJECTS` list in `lib/carousel/config.js` — each entry is `{ src, brand, desc, aspect }`. Leave `aspect: null` to auto-measure.

### Tune the feel

Everything lives in `lib/carousel/config.js`, documented inline. The most impactful knobs:

| Setting | What it does |
| --- | --- |
| `CONFIG.EASE` | Scroll glide weight — lower = heavier, more drift |
| `CONFIG.SNAP_DIST` | How early the settle-snap commits to a panel |
| `CONFIG.PANEL_H` | Panel height (widths follow image aspect) |
| `LENS.*` | Everything about the glass lens |
| `ENTRY.*` / `FOCUS.*` | Entry & focus choreography (durations, eases, staggers) |

For live tweaking there is a lil-gui dev panel, created hidden — edit `lib/carousel/gui.js` and remove the `gui.hide()` line while designing, then copy the numbers you land on back into `config.js`.

### Use the engine without React

`lib/carousel/engine.js` has no React imports. Mount it anywhere:

```js
import { createCarousel } from "./lib/carousel/engine";

const carousel = createCarousel(document.querySelector("#mount"), {
  onActiveChange: (i) => console.log("centered image", i),
  onFocusChange: (open) => {},
  onEntryDone: (done) => {},
});

// carousel.closeFocus(), carousel.replayEntry(), carousel.destroy()
```

## How it works (short version)

Want the full story — the infinite wrap math, the two-pass lens render, how GSAP and the layout cooperate? Read **[HOW-IT-WORKS.md](./HOW-IT-WORKS.md)**. (AI assistants get their own briefing in [AGENTS.md](./AGENTS.md).)

1. **Row** — an orthographic camera where 1 unit = 1 px. A pool of `REPEATS × N` plane meshes is repositioned every frame (`layout()`), wrapping positions around the total row width for the infinite effect.
2. **Scroll** — wheel input moves a `target`; `scroll` lerps toward it each frame. Once the wheel goes quiet and the remaining glide is small, `target` is redirected to the nearest panel center so the landing is part of the same glide.
3. **Lens** — pass 1 renders the row into a device-resolution framebuffer; pass 2 draws that texture through the lens shader on a fullscreen quad.
4. **Focus / entry** — GSAP timelines animate plain numbers (per-panel drop, grow and rise progress arrays); `layout()` reads them every frame, so canvas motion and easing stay in one place.

## Stack

[three.js](https://threejs.org) · [GSAP](https://gsap.com) · [Next.js](https://nextjs.org) · [Tailwind CSS](https://tailwindcss.com) · [lil-gui](https://lil-gui.georgealways.com/)

## License

MIT — see [LICENSE](./LICENSE). The license covers the code only: the demo images and font are **not** included (they belong to their original creators — see [CREDITS.md](./CREDITS.md)).
