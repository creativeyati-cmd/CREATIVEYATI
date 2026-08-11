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
target — where the row wants to be (moved by the wheel, or by a drag)
scroll — where the row actually is
```

Each frame: `scroll += (target - scroll) * ease`. That single lerp is the entire feel of the carousel — input yanks `target` around, and `scroll` trails it like it's being dragged through honey. Lower `EASE` = heavier.

### Dragging

Grabbing the row is the same system with a different input: each pointer move subtracts its delta from `target`. Three details make it feel right rather than merely work:

- **Pointer capture.** On press the canvas captures the pointer, so a drag that leaves the window keeps updating instead of dying mid-pull.
- **Click vs. drag.** A press accumulates travelled distance. Past `CLICK_SLOP` px the release sets `suppressClick`, which eats the browser's click event so a drag never accidentally opens focus mode. Touch gets a bigger slop, because fingers wobble.
- **Flick momentum.** Release speed (smoothed over several frames so one jittery frame can't define it) becomes `velocity`, which is added to `target` each frame and decays by `FRICTION`. But only if the pointer was *still moving* at release — let go after holding still and the row stops dead rather than launching.

Touch is deliberately held to a different standard than the mouse: fingers expect the row to stick to them, so touch drags run 1:1 and use a much harder follow ease (`TOUCH_EASE`). The weighty wheel lerp reads as lag when you're physically touching the thing.

### The settle snap

Free scroll alone stops wherever your input left it, which usually means an image half-off-center. The fix: once input has been idle for `SNAP_IDLE_MS`, redirect `target` once to the panel nearest the *current* scroll position, and switch to the slower `SNAP_EASE` so the landing reads as a soft touchdown.

Because only the *target* moves — the scroll keeps lerping — the landing is part of the same motion. There's no second animation, no click into place. It just looks like the glide happened to end on an image.

Idle time is the trigger for a reason. An earlier version gated the snap on remaining distance and velocity, and it fired at wildly different moments for a fast flick versus a slow scroll. How long you've stopped for means the same thing regardless of how fast you were going.

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

Click an image (a real click — a drag's trailing click is suppressed):

- If it's not centered, `target` is set to that panel's exact center and a flag waits for the glide to arrive (any manual scroll or grab cancels it).
- On arrival: every other panel animates a `drop` value from 0→1, which `layout()` turns into "slide down off-screen". Drops are staggered by distance from the clicked card, with left/right pairs grouped so it reads as a wave radiating outward. Meanwhile `lensFx` fades the distortion out and the focused panel scales up slightly.

Closing plays the same thing backwards (edges return first).

The important pattern: **GSAP never touches the meshes.** It animates plain numbers in arrays (`drop[]`, `growArr[]`, `pEntry[]`, `focusScale`, `lensFx`), and `layout()` reads them every frame when computing final positions. Canvas motion stays in one function; GSAP is just a fancy number-tweener.

## 5. The entry animation

On load, in two phases:

1. **Rise** — every visible panel starts below the screen at `startH` px tall and rises into the row, each after its own small random delay.
2. **Grow** — after a short hold, panels grow from `startH` to full height in a stagger (edges-in by default). During the grow, panel positions can't come from the normal layout (widths are mid-change), so `layout()` walks outward from the center panel, spacing each neighbour by *its own current width* — that's why growing panels push their neighbours apart smoothly. The lens blooms back in at the same time.

While the entry runs, scrolling and clicking are locked; when it finishes, the entry code hands off to the normal layout path and the React overlay fades its text in.

## Hover, when the world moves

One non-obvious problem: the pointer isn't the only thing that moves — the row slides underneath it. Testing hover only on pointer events left the state stale whenever the carousel scrolled beneath a still cursor: a panel arriving under the pointer got no grab cursor until you jiggled the mouse. So `refreshHover()` re-runs the hit test every frame, right after `layout()` rebuilds the panel rectangles.

The cursor and the trailing label are deliberately kept separate. The cursor reads raw geometry (`hoverPanel`) so it always reflects what's under the pointer; the label has extra gates on top (hidden during the entry, hidden while dragging — the grabbing hand carries that interaction on its own). All cursor writes funnel through one `updateCursor()` with a dedupe, since it runs every frame.

## The React layer

`Components/CarouselSection.jsx` doesn't know any of the above exists. It mounts the engine, and the engine reports back through three callbacks: which image is centered (for the heading/counter), whether focus is open (for the Close button), and whether the entry has finished (for the text reveal). The Close button calls `engine.closeFocus()`. That's the entire API surface — which is also why the engine can be lifted into a non-React project unchanged.

## Things that look odd but are load-bearing

- **`renderer.setClearColor(0xffffff)`** matches the page background so the framebuffer gaps between panels blend into the page.
- **Textures get mipmaps + anisotropy** on load. Panels render at ~80px tall during the entry; without mipmaps the downscale looks mushy.
- **The framebuffer is sized × devicePixelRatio** and resized the same way. Sizing it in CSS pixels renders at half resolution on retina and everything looks blurry.
- **`onFocusChange(false)` fires at the *start* of the close animation**, not the end — so the overlay UI animates back in sync with the returning cards. The internal `focusState.active` stays true until the timeline completes, which keeps scroll input locked during the transition.
