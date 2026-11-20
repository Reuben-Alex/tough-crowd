# Type pairings

Three faces with three jobs give a film a voice: a display face for the claim, an interface
face for the product, a mono face for anything raw (notes, code, terminal output). One face at
one weight for everything is what makes a film read as a template.

Use one pairing for the whole film. Every face here is bundled with HyperFrames, so it resolves
by name and needs no font files.

| Pairing | Display: the closing line and titles | Interface | Notes and code |
| --- | --- | --- | --- |
| `editorial` | EB Garamond 500, letter-spacing −0.02em | Inter 400 and 600 | IBM Plex Mono 400 |
| `modern` | Outfit 600, letter-spacing −0.03em | Inter 400 and 600 | JetBrains Mono 400 |
| `poster` | Playfair Display 600, letter-spacing −0.01em | Lato 400 and 700 | Space Mono 400 |

## Where each face goes

- **Display** appears only where the film speaks in its own voice: the closing line, and a
  title if there is one. Never inside the product's interface.
- **Interface** is everything the product itself would show: labels, rows, buttons, the brand
  wordmark. Use two weights, the heavier for what the viewer reads first.
- **Mono** is for what a person typed or a machine printed. It marks the "before" in a
  before-and-after.

## Sizes

- The closing line: each line 7% to 14% of the frame's height (76 to 150 px at 1080).
- Interface text the viewer must read: 2.6% of the frame's short side or more (28 px at 1080),
  measured after any scaling. HyperFrames `check` warns below that.
- One highlighted word or phrase at most, in the accent colour, and only where it carries
  meaning.

## Choosing

| The product is | Pairing | Stage it suits |
| --- | --- | --- |
| Calm, considered, for knowledge work | `editorial` | `warm-paper` |
| Technical, precise, for builders | `modern` | `cool-studio` |
| Expressive, cultural, for an audience | `poster` | `night` |

A person's own brand typeface replaces the display or the interface face when they supply the
font files (`/hyperframes` explains `@font-face` and `assets/fonts/`).
