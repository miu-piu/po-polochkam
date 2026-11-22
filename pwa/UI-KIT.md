# По полочкам — UI Kit v1.0

## Sources of truth

`styles.css` contains all UI tokens and component rules. `ui.js` provides one **offline outline icon family**, with consistent 24×24 SVG paths and 1.8px strokes. No external fonts or CDN. Printed label icons remain a separate black-and-white utility renderer in `app.js`.

## Tokens

| Token | Value |
|---|---|
| `--bg` | `#F2EBE2` |
| `--surface` | `#FFFDF9` |
| `--surface-muted` | `#F5EEE6` |
| `--text` | `#3C312A` |
| `--text-secondary` | `#75665A` |
| `--accent` | `#896853` |
| `--accent-hover` | `#76523D` |
| `--border` | `#DED1C4` |

Functional exceptions: `--danger` for destructive actions and `--focus` for keyboard focus. Spacing: 4 / 8 / 12 / 16 / 24 / 32 px.

## Type scale and components

One system font. Brand: 24px/700; panel heading: 18px/650; body: 14px/400; buttons: 14px/600; captions: 12px/400. Cards: 16px radius; controls: 10px radius; pills: fully rounded; minimum target: 48×48 CSS px (on mobile, where practical; icon controls).

- `.panel`: one surface, border and shadow system
- `.panel-head` and `h2`: same hierarchy in every panel
- `.btn` with modifiers `--primary`, `--secondary`, `--ghost`, `--icon`
- `.category`: filter chip, `.active` for pressed state
- `input`, `textarea`, `select`: common dimensions and focus state
- `.dialog-panel`: common modal appearance
- `data-icon="plus"`: UI icon from `ui.js`, same size and stroke

## Constraints

No stripes, texture, strong gradients, random radius or display fonts. One main action per context. Physical label rendering and dimensions remain independent of UI skin.

## Adaptive behavior

- `< 761px`: single active panel with bottom navigation; studio-first, catalog opens from a clear CTA; PDF access lives at the top of the editor. Safe-area padding is supported.
- `≥ 761px`: two-pane list/detail layout. Print list follows the editor; shared actions remain consistent.
- Mobile inputs use 16px to avoid Safari input-zoom, with spacing and line-height retained. Auxiliary copy uses sufficient contrast, with font scaling and reflow verified in Chromium.
- Dialogs use focus trapping, `inert` background, Escape and focus return. Destructive actions support a brief Undo affordance.