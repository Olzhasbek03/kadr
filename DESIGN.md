# Kormem design system

Mood: «Сырға салу at dusk: velvet crimson, ivory tulle, golden window light.»

## Color (OKLCH, light theme locked)

| Token | Value | Role |
| --- | --- | --- |
| `--bg` | `oklch(0.967 0.005 20)` | page body, whisper-rose ivory |
| `--surface` | `oklch(0.992 0.003 20)` | cards, inputs |
| `--ink` | `oklch(0.235 0.015 25)` | primary text, dark blocks |
| `--ink-2` | `oklch(0.44 0.02 25)` | secondary text (AA on bg) |
| `--line` | `oklch(0.885 0.01 25)` | hairlines |
| `--crimson` | `oklch(0.41 0.125 8)` | THE accent: CTAs, links, selection |
| `--crimson-deep` | `oklch(0.34 0.11 8)` | hover |
| `--rose` | `oklch(0.78 0.08 10)` | accent on dark surfaces only |
| `--ivory` | `oklch(0.96 0.006 20)` | text on dark blocks |

Golden warmth lives in the photographs, never in the UI chrome. Dark blocks (`--ink`) appear as deliberate full sections (the reveal block, footer, camera tool) and never alternate randomly.

## Typography

- **Display: Prata** (400 only, cyrillic-ext). High-contrast Didone; ceremonial. Sizes via clamp, max 6rem, letter-spacing 0/+0.01em. Never faux-bold.
- **Body/UI: Golos Text** (400/500/600, cyrillic-ext). Line-height 1.55 body, max 65ch.
- Emphasis inside display lines: color (`--crimson`) or size shift, same family. No italics (Prata has none).

## Shape & depth

- Radius rule: interactive pills (buttons, chips, filter swatches) = full; cards & media = 14px; inputs = 10px.
- No drop shadows as decoration. Depth = hairlines + photography + one soft elevation for lightbox/modals only.
- Veil motif: ivory scrims (`backdrop-blur` + white gradient) over photos for the hidden state.

## Motion

- Curve: `cubic-bezier(0.23, 1, 0.32, 1)` (strong ease-out), 150-250ms UI, up to 700ms for reveal moments.
- Signature: the veil lift (hero scrim clears on load), develop-in (photos sharpen from blur on reveal), scale(0.97) press feedback everywhere.
- `prefers-reduced-motion`: veils and develops become instant crossfades.

## Imagery

Real wedding photography (`/public/photos/*`), warm/hazy/in-motion. Full-bleed with ink gradient scrims for text legibility (text always ≥4.5:1 via scrim). Film-style filters are shown live on real photos.

## Copy rules

- No em-dashes anywhere (restructure the sentence).
- No uppercase-tracked eyebrows as section grammar.
- Numbers in Prata for ceremony moments (countdowns, shot counters).
