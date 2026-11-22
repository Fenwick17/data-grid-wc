# Web Components Library

A cross-framework web components library built with [Lit](https://lit.dev/) and TypeScript.

Components are standard Custom Elements, so they work in Angular, React, Vue, Svelte, and plain HTML without framework-specific adapters.

## Components

- `<data-grid>` — Data Grid with keyboard navigation, inline editing, a selection column, a row actions menu, and drag-to-reorder rows

### Keyboard model

| Key | Action |
| --- | --- |
| `Tab` / `Shift+Tab` | Move the active cell (when `navigation` includes `tab`) |
| `Arrow keys` | Move the active cell (when `navigation` includes `arrows`) |
| `Enter` | Enter edit mode on an editable cell; commit while editing a single-line field |
| `Escape` | Cancel the edit and restore the previous value |

**First name** uses a single-line input; **Job status** uses a floating
combobox with three options (Employed, Unemployed, Self-employed); **Hair
colour** uses a multi-line textarea. The textarea floats above the grid,
anchored to the cell's top-left corner, and can be resized in both directions.
In the textarea, `Enter` inserts a newline and blurring the field commits the
edit. In the combobox, typing filters the options, `ArrowUp`/`ArrowDown` move
the highlight, and `Enter` selects.

### Navigation

Set the `navigation` property to choose which keys move the active cell:

| Value | Behavior |
| --- | --- |
| `'arrows'` | Arrow keys move the active cell; `Tab` leaves the grid |
| `'tab'` | `Tab` / `Shift+Tab` move through every cell; arrow keys do nothing |
| `'both'` (default) | Both arrow keys and `Tab` move the active cell |

```js
document.querySelector('data-grid').navigation = 'arrows';
```

With `'tab'` or `'both'`, `Tab` walks through cells in row-major order and
leaves the grid when it reaches the last cell (or the first cell with
`Shift+Tab`).

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

### Row reordering

Each row has a drag handle in the first column. Drag the handle to move the
row; the grid updates its `data` array and emits a `row-reorder` event:

```js
grid.addEventListener('row-reorder', (event) => {
  console.log(event.detail.oldIndex, event.detail.newIndex, event.detail.data);
});
```

Dragging is powered by [SortableJS](https://sortablejs.github.io/Sortable/),
which works directly on the DOM and has no framework dependency. The handle is
decorative: it is hidden from assistive tech and skipped by keyboard
navigation. Keyboard users reorder rows with the actions menu's **Move up** /
**Move down**.

### Selection

The second column contains a checkbox per row. Each checkbox has an
`aria-label` of the form `Select <first name> <last name>`, so screen readers
announce which row it belongs to. When the active cell is in the selection
column, pressing `Space` toggles the checkbox.

### Actions menu

The last column contains a `⋮` button per row. Clicking it opens a floating
menu with row actions:

- **Delete row** — removes the row.
- **Duplicate row** — inserts a copy below the row.
- **Add row below** — inserts a blank row below.
- **Move up** — swaps the row with the one above (disabled on the first row).
- **Move down** — swaps the row with the one below (disabled on the last row).

With the Actions cell active, `Enter` or `Space` opens the menu too. The menu
is positioned with [Floating UI](https://floating-ui.com/) using the `fixed`
strategy, so it escapes any clipping ancestor.

Inside the menu, `ArrowUp`/`ArrowDown` move between enabled options (looping),
`Home`/`End` jump to the first/last enabled option, and `Enter`/`Space`
activate the focused option. `Escape` or clicking outside closes it.

### Data

Pass rows through the `data` property. The `Person` type is exported for
TypeScript consumers:

```ts
import type { Person } from 'web-components-library';

const rows: Person[] = [
  {
    firstName: 'Ada',
    lastName: 'Lovelace',
    jobStatus: 'Employed',
    hairColour: 'Brown',
  },
];

const grid = document.querySelector('data-grid')!;
grid.data = rows;
```

`data` is an array property, so set it on the element rather than as an
attribute. When the user edits a cell, adds/deletes/duplicates a row, moves a
row, or drags a row, the grid emits a `data-change` event with the new array:

```ts
grid.addEventListener('data-change', (event) => {
  rows = event.detail.data;
});
```

The `row-reorder` event additionally reports `oldIndex` / `newIndex` for drag
reordering.

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

- `dist/index.js` — ES module bundle (`lit`, `@floating-ui/dom`, and `sortablejs` kept external)
- `dist/index.umd.cjs` — UMD bundle (dependencies bundled, for plain `<script>`)
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
| `--data-grid-cell-min-width` | `8rem` | Minimum width of a data column |
| `--data-grid-handle-column-width` | `2.5rem` | Width of the drag-handle column |
| `--data-grid-handle-color` | `#888` | Drag-handle icon color |
| `--data-grid-select-column-width` | `5rem` | Width of the selection column |
| `--data-grid-actions-column-width` | `6rem` | Width of the actions column |
| `--data-grid-editor-background` | `Canvas` | Background of the floating textarea editor |

Exposed parts: `grid`, `header`, `header-cell`, `rows`, `row`, `cell`, `handle`, `cell-button`, `checkbox`, `input`, `textarea`, `menu-button`, `menu`, `menu-item`, `combobox`, `combobox-option`.

### Data Grid internals

The component is split into focused modules under `src/data-grid/`:

| File | Responsibility |
| --- | --- |
| `types.ts` | `Person` / `JobStatus` types, column config, default rows, option helpers |
| `row-ids.ts` | Stable row IDs used for keying and identity lookups |
| `row-order.ts` | DOM-order reading and array helpers |
| `row-actions.ts` | Pure delete / duplicate / add / move logic |
| `navigation.ts` | Keyboard cell navigation helpers |
| `positioning.ts` | Floating UI positioning for the menu, textarea, and combobox |
| `render.ts` | Pure cell and menu-item templates |

`src/data-grid.ts` holds the Lit element itself: state, event wiring, and lifecycle.

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
<script type="module">
  import 'web-components-library';

  const grid = document.querySelector('data-grid');
  grid.data = [
    { firstName: 'Ada', lastName: 'Lovelace', jobStatus: 'Employed', hairColour: 'Brown' },
  ];
  grid.addEventListener('data-change', (event) => {
    console.log(event.detail.data);
  });
</script>

<data-grid navigation="both"></data-grid>
```

Or, with the self-contained UMD build:

```html
<script src="dist/index.umd.cjs"></script>
<data-grid></data-grid>
```

### React

React 19 sets non-string props as properties on custom elements, so `data` can
be passed directly. On React 18, set it through a ref.

```tsx
import { useEffect, useRef } from 'react';
import 'web-components-library';
import type { Person } from 'web-components-library';

type DataGridElement = HTMLElement & { data: Person[] };

export function App({ rows }: { rows: Person[] }) {
  const gridRef = useRef<DataGridElement>(null);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    grid.data = rows;

    const onChange = (event: Event) =>
      console.log((event as CustomEvent<{ data: Person[] }>).detail.data);
    grid.addEventListener('data-change', onChange);
    return () => grid.removeEventListener('data-change', onChange);
  }, [rows]);

  return <data-grid ref={gridRef} navigation="both" />;
}
```

Add a JSX declaration so TypeScript accepts `<data-grid>`:

```ts
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'data-grid': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & { navigation?: 'arrows' | 'tab' | 'both' };
    }
  }
}
```

### Angular

Import the library once, allow custom elements in the template, and bind the
property and events:

```ts
import { CUSTOM_ELEMENTS_SCHEMA, Component } from '@angular/core';
import 'web-components-library';
import type { Person } from 'web-components-library';

@Component({
  selector: 'app-people',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <data-grid
      [data]="rows"
      navigation="both"
      (data-change)="rows = $any($event).detail.data"
      (row-reorder)="onReorder($any($event).detail)"
    ></data-grid>
  `,
})
export class PeopleComponent {
  rows: Person[] = [
    { firstName: 'Ada', lastName: 'Lovelace', jobStatus: 'Employed', hairColour: 'Brown' },
  ];

  onReorder(detail: { oldIndex: number; newIndex: number }) {
    console.log(detail);
  }
}
```

### Vue

Vue 3 sets properties for custom elements, so `:data` works. Tell the compiler
that `data-grid` is a custom element:

```ts
// vite.config.ts
vue({
  template: {
    compilerOptions: {
      isCustomElement: (tag) => tag === 'data-grid',
    },
  },
});
```

```vue
<script setup lang="ts">
import { ref } from 'vue';
import 'web-components-library';
import type { Person } from 'web-components-library';

const rows = ref<Person[]>([
  { firstName: 'Ada', lastName: 'Lovelace', jobStatus: 'Employed', hairColour: 'Brown' },
]);
</script>

<template>
  <data-grid
    :data="rows"
    navigation="both"
    @data-change="rows = $event.detail.data"
    @row-reorder="console.log($event.detail)"
  />
</template>
```

### Svelte

Svelte sets properties on custom elements when the property exists, so `data`
works directly:

```svelte
<script lang="ts">
  import 'web-components-library';
  import type { Person } from 'web-components-library';

  let rows: Person[] = [
    { firstName: 'Ada', lastName: 'Lovelace', jobStatus: 'Employed', hairColour: 'Brown' },
  ];
</script>

<data-grid
  data={rows}
  navigation="both"
  on:data-change={(event) => (rows = event.detail.data)}
  on:row-reorder={(event) => console.log(event.detail)}
/>
```

Svelte 5 also accepts the `ondatachange` / `onrowreorder` property syntax.

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
