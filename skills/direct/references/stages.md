# Stage presets

A stage is what the product sits on. A flat fill with one drop shadow reads as a mockup; a stage
with a ground, light, grain and a vignette reads as designed.

Pick one preset for the whole film and put the person's brand colours into it: change the
ground and the surface colours, keep the structure.

## How a stage is built

Five layers, in this order from back to front, plus a shadow recipe for anything that sits on
the stage:

| Layer | z-index | Job |
| --- | --- | --- |
| `#ground` | 0 | The base colour, as a shallow diagonal gradient |
| `#light` | 1 | A large soft light under the content |
| content | 2, 3 | Your scenes and the closing line |
| `#glow` | 4 | A fainter light over the content, so the stage and the product share one light |
| `#grain` | 5 | Fine texture over everything |
| `#vignette` | 6 | Darker edges, to hold the eye in the middle |

Rules:

- The light and the glow drift slowly and at constant speed for the whole film, driven from the
  composition's timeline (see Wiring the drift). A stage whose light never moves is a backdrop.
- Stage layers are plain elements with no `data-start`: they are there for the whole film.
- Give the ids a short prefix per scene file (`#intro-ground`), since ids must be unique across
  the assembled page; or put the stage once in the scene that holds the whole film.
- Mark `#light` and `#glow` with `data-layout-allow-overflow`: they are larger than the frame
  on purpose.
- Text colours below pass WCAG AA on their surface. Re-run `npx hyperframes check` after
  changing any of them.

## warm-paper

Warm, calm, editorial. The stage the first judged film used. Suits the `editorial` type pairing.

```css
#ground {
  position: absolute; inset: 0; z-index: 0;
  background: linear-gradient(168deg, #e0d0b9 0%, #d9c7ae 46%, #cdb898 100%);
}
#light {
  position: absolute; left: -200px; top: -260px; width: 1700px; height: 1200px; z-index: 1;
  background: radial-gradient(ellipse 50% 50% at 50% 50%, rgba(255, 246, 228, 0.62) 0%, rgba(255, 246, 228, 0) 100%);
}
#glow {
  position: absolute; left: 300px; top: -200px; width: 1500px; height: 1100px; z-index: 4;
  opacity: 0.5; pointer-events: none;
  background: radial-gradient(ellipse 50% 50% at 50% 50%, rgba(255, 240, 214, 0.5) 0%, rgba(255, 240, 214, 0) 100%);
}
#grain {
  position: absolute; inset: 0; z-index: 5; pointer-events: none;
  opacity: 0.16; mix-blend-mode: multiply; background-size: 320px 320px;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='320' height='320'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' seed='7' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.35  0 0 0 0 0.28  0 0 0 0 0.2  0 0 0 0.9 0'/></filter><rect width='320' height='320' filter='url(%23n)'/></svg>");
}
#vignette {
  position: absolute; inset: 0; z-index: 6; pointer-events: none;
  background: radial-gradient(ellipse 75% 75% at 50% 48%, rgba(60, 40, 20, 0) 58%, rgba(60, 40, 20, 0.2) 100%);
}
/* anything that sits on the stage */
.card {
  background: #fbf7f0;
  box-shadow: 0 1px 1px rgba(60, 40, 20, 0.16), 0 3px 6px rgba(60, 40, 20, 0.1), 0 14px 30px rgba(60, 40, 20, 0.1), 0 50px 110px rgba(60, 40, 20, 0.22);
}
/* ink #241e18 · surface #fbf7f0 · line #e3d8c8 · muted #6b5f52 */
```

## cool-studio

Neutral, bright, technical. For developer tools and data products. Suits the `modern` type pairing.

```css
#ground {
  position: absolute; inset: 0; z-index: 0;
  background: linear-gradient(168deg, #e6e9ec 0%, #d7dce1 46%, #c6cdd4 100%);
}
#light {
  position: absolute; left: -200px; top: -260px; width: 1700px; height: 1200px; z-index: 1;
  background: radial-gradient(ellipse 50% 50% at 50% 50%, rgba(255, 255, 255, 0.7) 0%, rgba(255, 255, 255, 0) 100%);
}
#glow {
  position: absolute; left: 300px; top: -200px; width: 1500px; height: 1100px; z-index: 4;
  opacity: 0.5; pointer-events: none;
  background: radial-gradient(ellipse 50% 50% at 50% 50%, rgba(240, 246, 255, 0.45) 0%, rgba(240, 246, 255, 0) 100%);
}
#grain {
  position: absolute; inset: 0; z-index: 5; pointer-events: none;
  opacity: 0.14; mix-blend-mode: multiply; background-size: 320px 320px;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='320' height='320'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' seed='7' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.28  0 0 0 0 0.3  0 0 0 0 0.33  0 0 0 0.9 0'/></filter><rect width='320' height='320' filter='url(%23n)'/></svg>");
}
#vignette {
  position: absolute; inset: 0; z-index: 6; pointer-events: none;
  background: radial-gradient(ellipse 75% 75% at 50% 48%, rgba(20, 30, 40, 0) 58%, rgba(20, 30, 40, 0.18) 100%);
}
/* anything that sits on the stage */
.card {
  background: #ffffff;
  box-shadow: 0 1px 1px rgba(20, 30, 45, 0.16), 0 3px 6px rgba(20, 30, 45, 0.1), 0 14px 30px rgba(20, 30, 45, 0.1), 0 50px 110px rgba(20, 30, 45, 0.22);
}
/* ink #16191c · surface #ffffff · line #dfe3e7 · muted #5b6570 */
```

## night

Dark, quiet, high contrast. For media, creative and after-hours products. Suits the `poster` type pairing.

```css
#ground {
  position: absolute; inset: 0; z-index: 0;
  background: linear-gradient(168deg, #1a1b1f 0%, #141518 46%, #0d0e10 100%);
}
#light {
  position: absolute; left: -200px; top: -260px; width: 1700px; height: 1200px; z-index: 1;
  background: radial-gradient(ellipse 50% 50% at 50% 50%, rgba(120, 140, 175, 0.18) 0%, rgba(120, 140, 175, 0) 100%);
}
#glow {
  position: absolute; left: 300px; top: -200px; width: 1500px; height: 1100px; z-index: 4;
  opacity: 1; pointer-events: none;
  background: radial-gradient(ellipse 50% 50% at 50% 50%, rgba(150, 170, 210, 0.12) 0%, rgba(150, 170, 210, 0) 100%);
}
#grain {
  position: absolute; inset: 0; z-index: 5; pointer-events: none;
  opacity: 0.1; mix-blend-mode: screen; background-size: 320px 320px;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='320' height='320'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' seed='7' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.8  0 0 0 0 0.82  0 0 0 0 0.9  0 0 0 0.9 0'/></filter><rect width='320' height='320' filter='url(%23n)'/></svg>");
}
#vignette {
  position: absolute; inset: 0; z-index: 6; pointer-events: none;
  background: radial-gradient(ellipse 75% 75% at 50% 48%, rgba(0, 0, 0, 0) 58%, rgba(0, 0, 0, 0.5) 100%);
}
/* anything that sits on the stage */
.card {
  background: #222429;
  box-shadow: 0 1px 1px rgba(0, 0, 0, 0.32), 0 3px 6px rgba(0, 0, 0, 0.2), 0 14px 30px rgba(0, 0, 0, 0.2), 0 50px 110px rgba(0, 0, 0, 0.44);
}
/* ink #f2efe9 · surface #222429 · line #33363d · muted #a3a7af */
```

## Wiring the drift

In the scene's timeline, for a film of `D` seconds:

```js
tl.fromTo("#light", { x: -150, y: -40 }, { x: 130, y: 30, duration: D, ease: "none" }, 0);
tl.fromTo("#glow", { x: 120, y: 0 }, { x: -260, y: 90, duration: D, ease: "none" }, 0);
```

Constant speed is the point here, so `ease: "none"` is right. A brief lift in the glow's
opacity (about +0.4 for a second) on the film's key action, such as a prompt being sent, ties
the light to the product.

A working example of all three presets is in `examples/stages/`.
