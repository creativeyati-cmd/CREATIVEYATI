# How the carousel works

A walkthrough of what's actually going on in `lib/carousel/engine.js`, for anyone who wants to understand, tweak or steal parts of it. No step is magic — it's five small systems layered on top of each other.

## 1. The row

There's no HTML in the carousel itself. Every image is a three.js plane mesh, rendered with an **orthographic camera set up so 1 world unit = 1 pixel**. That one decision makes all the math readable: positions and sizes are just pixels, no projection to reason about.

Every panel is the same height (`CONFIG.PANEL_H`). Width comes from each image's own aspect ratio, so nothing is cropped or stretched:

```
width = aspect * PANEL_H          slot = width + GAP
```

Lay the slots end to end and you get one "loop" — the full set of 12 images, `totalWidth` pixels wide. The `offsets` array remembers where each slot starts inside that loop.

### Making it infinite

The row wraps. The trick is in `layout()`, which runs every frame:

- take a panel's position inside the loop, subtract the current scroll,
- wrap it with a modulo so it always lands inside one loop-width window around the screen,
- hide any mesh that ends up off-screen.

Since a wide monitor might need to show more than one copy of the same image at once, there isn't one mesh per image — there's a **pool of 4 copies of the full set** (`REPEATS`). Each copy covers a different "rung" of the wrap, so panels never run dry at the edges.

Nothing is ever created or destroyed while scrolling. The same 48 meshes get repositioned forever.

## 2. The scroll

Two numbers drive everything:

```
target — where the row wants to be (moved instantly by the wheel)
scroll — where the row actually is
```

Each frame: `scroll += (target - scroll) * CONFIG.EASE`. That single lerp is the entire feel of the carousel — the wheel yanks `target` around, and `scroll` trails it like it's being dragged through honey. Lower `EASE` = heavier.

### The settle snap

Free scroll alone stops wherever your finger left it, which usually means an image half-off-center. The fix: when the wheel has been quiet for `SNAP_DELAY` ms **and** the remaining glide is under `SNAP_DIST` px (i.e. the scroll is visibly dying out), redirect `target` once to the nearest panel center.

Because only the *target* moves — the scroll keeps lerping exactly like before — the landing is part of the same glide. There's no second animation, no click into place. It just looks like the glide happened to end on an image.

One flag (`snapArmed`) makes sure this fires once per gesture, and any new wheel input re-arms it.

### Speed shrink

The scroll speed is smoothed into a 0..1 "energy" value (fast attack, slow decay). Panels scale down by up to 25% × energy, so the row visually compresses when you rip through it and relaxes when it settles.

## 3. The lens

The glass look is a two-pass render:

1. The whole row is rendered into an **offscreen framebuffer** (at device resolution — on retina screens the buffer is 2× the CSS size, otherwise everything would be soft).
2. A fullscreen quad draws that framebuffer to screen through a fragment shader.

Inside the shader, a disc (or rounded rect) region gets the treatment: UVs are pulled inward (refraction), the rim gets chromatic dispersion by sampling the texture ~16 times along a small offset and weighting the samples red-to-blue, plus a white nova at the center, a shimmering blue ring, a bright border line, and a sine-based fluid wave that wobbles the rim. Outside the disc, the framebuffer passes through untouched.

Every knob is a uniform, mirrored 1:1 from `LENS` in `config.js`.

The distortion-type uniforms (dispersion, ring, zoom…) are additionally multiplied by a single `lensFx` factor each frame. Animating that one number from 1 to 0 melts the whole lens away — that's how focus mode and the entry animation fade it without touching individual settings.

## 4. Focus mode

Click an image:

- If it's not centered, `target` is set to that panel's exact center and a flag waits for the glide to arrive (any manual scroll cancels it).
- On arrival: every other panel animates a `drop` value from 0→1, which `layout()` turns into "slide down off-screen". Drops are staggered by distance from the clicked card, with left/right pairs grouped so it reads as a wave radiating outward. Meanwhile `lensFx` fades the distortion out and the focused panel scales up slightly.

Closing plays the same thing backwards (edges return first).

The important pattern: **GSAP never touches the meshes.** It animates plain numbers in arrays (`drop[]`, `growArr[]`, `pEntry[]`, `focusScale`, `lensFx`), and `layout()` reads them every frame when computing final positions. Canvas motion stays in one function; GSAP is just a fancy number-tweener.

## 5. The entry animation

On load, in two phases:

1. **Rise** — every visible panel starts below the screen at `startH` px tall and rises into the row, each after its own small random delay.
2. **Grow** — after a short hold, panels grow from `startH` to full height in a stagger (edges-in by default). During the grow, panel positions can't come from the normal layout (widths are mid-change), so `layout()` walks outward from the center panel, spacing each neighbour by *its own current width* — that's why growing panels push their neighbours apart smoothly. The lens blooms back in at the same time.

While the entry runs, scrolling and clicking are locked; when it finishes, the entry code hands off to the normal layout path and the React overlay fades its text in.

## The React layer

`Components/CarouselSection.jsx` doesn't know any of the above exists. It mounts the engine, and the engine reports back through three callbacks: which image is centered (for the heading/counter), whether focus is open (for the Close button), and whether the entry has finished (for the text reveal). The Close button calls `engine.closeFocus()`. That's the entire API surface — which is also why the engine can be lifted into a non-React project unchanged.

## Things that look odd but are load-bearing

- **`renderer.setClearColor(0xffffff)`** matches the page background so the framebuffer gaps between panels blend into the page.
- **Textures get mipmaps + anisotropy** on load. Panels render at ~80px tall during the entry; without mipmaps the downscale looks mushy.
- **The framebuffer is sized × devicePixelRatio** and resized the same way. Sizing it in CSS pixels renders at half resolution on retina and everything looks blurry.
- **`onFocusChange(false)` fires at the *start* of the close animation**, not the end — so the overlay UI animates back in sync with the returning cards. The internal `focusState.active` stays true until the timeline completes, which keeps scroll input locked during the transition.
