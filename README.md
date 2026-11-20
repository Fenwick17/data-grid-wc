# Web Components Library

A cross-framework web components library built with [Lit](https://lit.dev/) and TypeScript.

Components are standard Custom Elements, so they work in Angular, React, Vue, Svelte, and plain HTML without framework-specific adapters.

## Components

- `<data-grid>` — Data Grid with keyboard navigation and inline editing

### Keyboard model

| Key | Action |
| --- | --- |
| `Tab` | Move focus into the grid (the active cell is the tab stop) |
| `Arrow keys` | Move the active cell |
| `Enter` | Enter edit mode on an editable cell; commit while editing |
| `Escape` | Cancel the edit and restore the previous value |

Only the **First name** column is editable in this version.

### Mouse and touch

| Action | Result |
| --- | --- |
| Click a cell | Focuses the cell |
| Click the same cell again | Enters edit mode (editable cells only) |

Editable cells render as a transparent `<button>` that fills the cell, so it
looks identical to plain cell text. The button gives assistive tech a native,
actionable element: a VoiceOver or TalkBack double-tap activates it and enters
edit mode. Entering edit mode focuses and selects the input so the screen
reader announces it as a text field.

Pressing `Escape` while editing cancels the edit and returns the cell to its
button state.

## Development

```bash
npm install
npm run build
```

### Scripts

| Script | Description |
| --- | --- |
| `npm run clean` | Remove `dist/` |
| `npm run build` | Clean, emit type declarations, and bundle |
| `npm run build:types` | Emit `.d.ts` declarations only |
| `npm run build:watch` | Rebuild bundles on change |
| `npm run typecheck` | Type-check without emitting |
| `npm start` | Run the example app locally |
| `npm run start:host` | Run the example app on the local network |
| `npm run start:build` | Build the example app to `dist-example/` |
| `npm run start:preview` | Preview the built example app |

### Output

- `dist/index.js` — ES module bundle (`lit` kept external)
- `dist/index.umd.cjs` — UMD bundle (`lit` bundled, for plain `<script>`)
- `dist/index.d.ts` — Type declarations
- `dist/theme.css` — Design tokens (the base CSS), importable as `web-components-library/theme.css`

## Styling

Styles are split into three layers, each with a clear job:

| Layer | File | Purpose |
| --- | --- | --- |
| **Design tokens** | `src/styles/tokens.css` | The base CSS. Defines every tunable value as a CSS custom property on `:root`. Published as `dist/theme.css`. |
| **Component styles** | `src/data-grid.css` | Scoped to the component's Shadow DOM. Consumes tokens via `var(--token, fallback)`. Not imported by consumers. |
| **Example page styles** | `example/styles.css` | Styles for the playground page only. |

### Why tokens use `var()` fallbacks

Component CSS references tokens as `var(--token, fallback)` rather than declaring them on `:host`. A `:host` declaration would beat inherited values, which would stop consumers from theming globally via `:root`. With fallbacks, the component works out of the box *and* consumers can override on `:root` or on the element.

### Consuming the base CSS

Import the token file once in your app, then override what you need:

```js
import 'web-components-library/theme.css';
```

```css
/* Global — affects every instance */
:root {
  --data-grid-border-color: rebeccapurple;
}

/* Per instance */
data-grid.featured {
  --data-grid-border-color: hotpink;
  --data-grid-border-radius: 0;
}
```

Importing `theme.css` is optional — components ship fallbacks — but it gives you one documented place to read and change the defaults.

### Structural overrides with `::part()`

When tokens aren't enough, style internal elements directly through exposed parts:

```css
data-grid::part(header-cell) {
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
```

### `data-grid` tokens

| Token | Default | Description |
| --- | --- | --- |
| `--data-grid-font-family` | `system-ui, ...` | Host font family |
| `--data-grid-color` | `inherit` | Host text color |
| `--data-grid-background` | `transparent` | Grid background |
| `--data-grid-header-background` | `rgba(127, 127, 127, 0.08)` | Header row background |
| `--data-grid-header-color` | `inherit` | Header text color |
| `--data-grid-border-color` | `#d0d0d5` | Grid border color |
| `--data-grid-border-style` | `solid` | Grid border style |
| `--data-grid-border-width` | `1px` | Grid border width |
| `--data-grid-border-radius` | `8px` | Grid outer border radius |
| `--data-grid-focus-color` | `#6366f1` | Keyboard focus ring color |
| `--data-grid-cell-padding` | `0.75rem 1rem` | Cell padding |

Exposed parts: `grid`, `header`, `header-cell`, `row`, `cell`, `cell-button`, `input`.

## Examples

The `example/` directory is a small Vite-powered playground for viewing and manually testing components.

```bash
npm start
```

This serves `example/index.html` at http://localhost:5173 and reloads on change. It imports components directly from `src/`, so no library build is required while developing.

To add a component to the playground:

1. Import it in `example/main.ts` (this registers the custom element).
2. Add a `<section class="example">` for it in `example/index.html`.

## Usage

### Plain HTML

```html
<script type="module" src="dist/index.js"></script>
<data-grid></data-grid>
```

Or, with the self-contained UMD build:

```html
<script src="dist/index.umd.cjs"></script>
<data-grid></data-grid>
```

### React

```jsx
import 'web-components-library';

function App() {
  return <data-grid />;
}
```

### Angular

```ts
// main.ts or a module
import 'web-components-library';
```

```html
<data-grid></data-grid>
```

## Adding a new component

1. Create a new file in `src/` (e.g. `src/my-component.ts`).
2. Create a matching stylesheet (e.g. `src/my-component.css`). Reference tokens with `var(--my-component-*, fallback)` and expose internal elements with `part="..."`.
3. Add the component's tokens to `src/styles/tokens.css` so they appear in the base CSS.
4. Define a class extending `LitElement` and register it with `@customElement('my-component')`.
5. Export it from `src/index.ts`.
6. Import it in `example/main.ts` and add a section to `example/index.html`.

```ts
import { LitElement, html, unsafeCSS } from 'lit';
import { customElement } from 'lit/decorators.js';
import styles from './my-component.css?inline';

@customElement('my-component')
export class MyComponent extends LitElement {
  static override styles = unsafeCSS(styles);

  override render() {
    return html`<div part="content"><slot></slot></div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'my-component': MyComponent;
  }
}
```

```css
/* src/my-component.css */
:host {
  display: block;
  color: var(--my-component-color, inherit);
}
```
