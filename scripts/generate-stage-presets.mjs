// Writes skills/direct/references/stages.md and examples/stages/ from one table, so the
// reference and the examples cannot drift apart. Edit the table, then run:
//   node scripts/generate-stage-presets.mjs
// A test regenerates into a temp folder and compares, so a hand edit to either side fails.
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const repo = process.argv[2] ?? fileURLToPath(new URL("..", import.meta.url));

const noise = (matrix) =>
  `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='320' height='320'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' seed='7' stitchTiles='stitch'/><feColorMatrix values='${matrix}'/></filter><rect width='320' height='320' filter='url(%23n)'/></svg>")`;

const TYPE = {
  editorial: { display: '"EB Garamond", serif', weight: 500, tracking: "-0.02em", ui: '"Inter", sans-serif', bold: 600, mono: '"IBM Plex Mono", monospace' },
  modern: { display: '"Outfit", sans-serif', weight: 600, tracking: "-0.03em", ui: '"Inter", sans-serif', bold: 600, mono: '"JetBrains Mono", monospace' },
  poster: { display: '"Playfair Display", serif', weight: 600, tracking: "-0.01em", ui: '"Lato", sans-serif', bold: 700, mono: '"Space Mono", monospace' },
};

const PRESETS = [
  {
    name: "warm-paper", title: "Warm paper", prefix: "wp", type: "editorial",
    use: "Warm, calm, editorial. The stage the first judged film used.",
    ground: ["#e0d0b9", "#d9c7ae", "#cdb898"],
    light: "255, 246, 228", lightA: 0.62, glow: "255, 240, 214", glowA: 0.5, glowOpacity: 0.5,
    grainBlend: "multiply", grainOpacity: 0.16, grainMatrix: "0 0 0 0 0.35  0 0 0 0 0.28  0 0 0 0 0.2  0 0 0 0.9 0",
    vignette: "60, 40, 20", vignetteA: 0.2, shadow: "60, 40, 20", shadowA: [0.16, 0.1, 0.1, 0.22],
    ink: "#241e18", surface: "#fbf7f0", line: "#e3d8c8", muted: "#6b5f52",
  },
  {
    name: "cool-studio", title: "Cool studio", prefix: "cs", type: "modern",
    use: "Neutral, bright, technical. For developer tools and data products.",
    ground: ["#e6e9ec", "#d7dce1", "#c6cdd4"],
    light: "255, 255, 255", lightA: 0.7, glow: "240, 246, 255", glowA: 0.45, glowOpacity: 0.5,
    grainBlend: "multiply", grainOpacity: 0.14, grainMatrix: "0 0 0 0 0.28  0 0 0 0 0.3  0 0 0 0 0.33  0 0 0 0.9 0",
    vignette: "20, 30, 40", vignetteA: 0.18, shadow: "20, 30, 45", shadowA: [0.16, 0.1, 0.1, 0.22],
    ink: "#16191c", surface: "#ffffff", line: "#dfe3e7", muted: "#5b6570",
  },
  {
    name: "night", title: "Night", prefix: "nt", type: "poster",
    use: "Dark, quiet, high contrast. For media, creative and after-hours products.",
    ground: ["#1a1b1f", "#141518", "#0d0e10"],
    light: "120, 140, 175", lightA: 0.18, glow: "150, 170, 210", glowA: 0.12, glowOpacity: 1,
    grainBlend: "screen", grainOpacity: 0.1, grainMatrix: "0 0 0 0 0.8  0 0 0 0 0.82  0 0 0 0 0.9  0 0 0 0.9 0",
    vignette: "0, 0, 0", vignetteA: 0.5, shadow: "0, 0, 0", shadowA: [0.32, 0.2, 0.2, 0.44],
    ink: "#f2efe9", surface: "#222429", line: "#33363d", muted: "#a3a7af",
  },
];

const shadow = (p) =>
  `0 1px 1px rgba(${p.shadow}, ${p.shadowA[0]}), 0 3px 6px rgba(${p.shadow}, ${p.shadowA[1]}), 0 14px 30px rgba(${p.shadow}, ${p.shadowA[2]}), 0 50px 110px rgba(${p.shadow}, ${p.shadowA[3]})`;

/** The stage layers as CSS. `id` maps a layer name to its selector. */
const layers = (p, id, indent = "") =>
  [
    `${id("ground")} {`,
    `  position: absolute; inset: 0; z-index: 0;`,
    `  background: linear-gradient(168deg, ${p.ground[0]} 0%, ${p.ground[1]} 46%, ${p.ground[2]} 100%);`,
    `}`,
    `${id("light")} {`,
    `  position: absolute; left: -200px; top: -260px; width: 1700px; height: 1200px; z-index: 1;`,
    `  background: radial-gradient(ellipse 50% 50% at 50% 50%, rgba(${p.light}, ${p.lightA}) 0%, rgba(${p.light}, 0) 100%);`,
    `}`,
    `${id("glow")} {`,
    `  position: absolute; left: 300px; top: -200px; width: 1500px; height: 1100px; z-index: 4;`,
    `  opacity: ${p.glowOpacity}; pointer-events: none;`,
    `  background: radial-gradient(ellipse 50% 50% at 50% 50%, rgba(${p.glow}, ${p.glowA}) 0%, rgba(${p.glow}, 0) 100%);`,
    `}`,
    `${id("grain")} {`,
    `  position: absolute; inset: 0; z-index: 5; pointer-events: none;`,
    `  opacity: ${p.grainOpacity}; mix-blend-mode: ${p.grainBlend}; background-size: 320px 320px;`,
    `  background-image: ${noise(p.grainMatrix)};`,
    `}`,
    `${id("vignette")} {`,
    `  position: absolute; inset: 0; z-index: 6; pointer-events: none;`,
    `  background: radial-gradient(ellipse 75% 75% at 50% 48%, rgba(${p.vignette}, 0) 58%, rgba(${p.vignette}, ${p.vignetteA}) 100%);`,
    `}`,
  ]
    .map((line) => indent + line)
    .join("\n");

const stagesMd = `# Stage presets

A stage is what the product sits on. A flat fill with one drop shadow reads as a mockup; a stage
with a ground, light, grain and a vignette reads as designed.

Pick one preset for the whole film and put the person's brand colours into it: change the
ground and the surface colours, keep the structure.

## How a stage is built

Five layers, in this order from back to front, plus a shadow recipe for anything that sits on
the stage:

| Layer | z-index | Job |
| --- | --- | --- |
| \`#ground\` | 0 | The base colour, as a shallow diagonal gradient |
| \`#light\` | 1 | A large soft light under the content |
| content | 2, 3 | Your scenes and the closing line |
| \`#glow\` | 4 | A fainter light over the content, so the stage and the product share one light |
| \`#grain\` | 5 | Fine texture over everything |
| \`#vignette\` | 6 | Darker edges, to hold the eye in the middle |

Rules:

- The light and the glow drift slowly and at constant speed for the whole film, driven from the
  composition's timeline (see Wiring the drift). A stage whose light never moves is a backdrop.
- Stage layers are plain elements with no \`data-start\`: they are there for the whole film.
- Give the ids a short prefix per scene file (\`#intro-ground\`), since ids must be unique across
  the assembled page; or put the stage once in the scene that holds the whole film.
- Mark \`#light\` and \`#glow\` with \`data-layout-allow-overflow\`: they are larger than the frame
  on purpose.
- Text colours below pass WCAG AA on their surface. Re-run \`npx hyperframes check\` after
  changing any of them.

${PRESETS.map(
  (p) => `## ${p.name}

${p.use} Suits the \`${p.type}\` type pairing.

\`\`\`css
${layers(p, (layer) => `#${layer}`)}
/* anything that sits on the stage */
.card {
  background: ${p.surface};
  box-shadow: ${shadow(p)};
}
/* ink ${p.ink} · surface ${p.surface} · line ${p.line} · muted ${p.muted} */
\`\`\`
`,
).join("\n")}
## Wiring the drift

In the scene's timeline, for a film of \`D\` seconds:

\`\`\`js
tl.fromTo("#light", { x: -150, y: -40 }, { x: 130, y: 30, duration: D, ease: "none" }, 0);
tl.fromTo("#glow", { x: 120, y: 0 }, { x: -260, y: 90, duration: D, ease: "none" }, 0);
\`\`\`

Constant speed is the point here, so \`ease: "none"\` is right. A brief lift in the glow's
opacity (about +0.4 for a second) on the film's key action, such as a prompt being sent, ties
the light to the product.

A working example of all three presets is in \`examples/stages/\`.
`;

const composition = (p) => {
  const t = TYPE[p.type];
  const id = (layer) => `#${p.prefix}-${layer}`;
  return `<!doctype html>
<!-- Stage preset "${p.name}" with the "${p.type}" type pairing. See skills/direct/references/stages.md. -->
<html lang="en" data-composition-id="${p.name}" data-composition-duration="6">
  <head>
    <meta charset="UTF-8" />
    <title>${p.title}</title>
  </head>
  <body>
    <template>
      <style>
        #root {
          position: absolute;
          inset: 0;
          overflow: hidden;
          color: ${p.ink};
          font-family: ${t.ui};
        }
${layers(p, id, "        ")}
        #${p.prefix}-scene {
          position: absolute;
          inset: 0;
          z-index: 2;
        }
        #${p.prefix}-card {
          position: absolute;
          left: 410px;
          top: 270px;
          width: 1100px;
          height: 540px;
          border-radius: 26px;
          background: ${p.surface};
          border: 1px solid ${p.line};
          box-shadow: ${shadow(p)};
        }
        #${p.prefix}-title {
          position: absolute;
          left: 72px;
          top: 64px;
          font-family: ${t.display};
          font-size: 112px;
          font-weight: ${t.weight};
          letter-spacing: ${t.tracking};
          line-height: 120px;
          white-space: nowrap;
        }
        #${p.prefix}-rule {
          position: absolute;
          left: 72px;
          right: 72px;
          top: 222px;
          height: 2px;
          background: ${p.line};
        }
        #${p.prefix}-strong {
          position: absolute;
          left: 72px;
          top: 262px;
          font-size: 36px;
          font-weight: ${t.bold};
          line-height: 48px;
          white-space: nowrap;
        }
        #${p.prefix}-muted {
          position: absolute;
          left: 72px;
          top: 326px;
          font-size: 30px;
          font-weight: 400;
          line-height: 42px;
          color: ${p.muted};
          white-space: nowrap;
        }
        #${p.prefix}-mono {
          position: absolute;
          left: 72px;
          top: 408px;
          font-family: ${t.mono};
          font-size: 28px;
          font-weight: 400;
          line-height: 40px;
          white-space: nowrap;
        }
      </style>

      <div id="root" data-composition-id="${p.name}" data-width="1920" data-height="1080">
        <div id="${p.prefix}-ground"></div>
        <div id="${p.prefix}-light" data-layout-allow-overflow></div>
        <div
          id="${p.prefix}-scene"
          class="clip"
          data-start="0"
          data-duration="6"
          data-track-index="0"
        >
          <div id="${p.prefix}-card">
            <div id="${p.prefix}-title">${p.title}</div>
            <div id="${p.prefix}-rule"></div>
            <div id="${p.prefix}-strong">Interface text sits on the surface colour</div>
            <div id="${p.prefix}-muted">Secondary text uses the muted colour</div>
            <div id="${p.prefix}-mono">notes and code use the mono face</div>
          </div>
        </div>
        <div id="${p.prefix}-glow" data-layout-allow-overflow></div>
        <div id="${p.prefix}-grain"></div>
        <div id="${p.prefix}-vignette"></div>
      </div>

      <script>
        (function () {
          var D = 6;
          var tl = gsap.timeline({ paused: true });
          // The stage light drifts at constant speed for the whole scene.
          tl.fromTo("${id("light")}", { x: -150, y: -40 }, { x: 130, y: 30, duration: D, ease: "none" }, 0);
          tl.fromTo("${id("glow")}", { x: 120, y: 0 }, { x: -260, y: 90, duration: D, ease: "none" }, 0);
          // The card settles in once, then is still.
          tl.fromTo("${id("card")}", { scale: 1.04 }, { scale: 1, duration: 1.4, ease: "expo.out" }, 0);
          window.__timelines = window.__timelines || {};
          window.__timelines["${p.name}"] = tl;
        })();
      </script>
    </template>
  </body>
</html>
`;
};

const host = (p, index) => `      <div
        id="${p.name}"
        data-composition-id="${p.name}"
        data-composition-src="compositions/${p.name}.html"
        data-start="${index * 6}"
        data-duration="6"
        data-track-index="0"
        data-track-kind="graphics"
        data-width="1920"
        data-height="1080"
      ></div>`;

const indexHtml = `<!doctype html>
<!-- The three stage presets, six seconds each. See skills/direct/references/stages.md. -->
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      html,
      body {
        margin: 0;
        width: 1920px;
        height: 1080px;
        overflow: hidden;
        background: #000;
      }
      #root {
        position: relative;
        width: 1920px;
        height: 1080px;
        overflow: hidden;
      }
    </style>
  </head>
  <body>
    <div
      id="root"
      data-composition-id="main"
      data-start="0"
      data-duration="18"
      data-width="1920"
      data-height="1080"
    >
${PRESETS.map(host).join("\n")}
    </div>
    <script>
      window.__timelines = window.__timelines || {};
      window.__timelines["main"] = gsap.timeline({ paused: true });
    </script>
  </body>
</html>
`;

await mkdir(join(repo, "skills/direct/references"), { recursive: true });
await writeFile(join(repo, "skills/direct/references/stages.md"), stagesMd);
await mkdir(join(repo, "examples/stages/compositions"), { recursive: true });
for (const p of PRESETS) {
  await writeFile(join(repo, `examples/stages/compositions/${p.name}.html`), composition(p));
}
await writeFile(join(repo, "examples/stages/index.html"), indexHtml);
console.log("written");
