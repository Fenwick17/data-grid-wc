import { LitElement, html, unsafeCSS } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import styles from './data-grid.css?inline';

export interface Person {
  firstName: string;
  lastName: string;
  age: number;
  hairColour: string;
}

interface Column {
  key: keyof Person;
  label: string;
  editable: boolean;
}

const COLUMNS: ReadonlyArray<Column> = [
  { key: 'firstName', label: 'First name', editable: true },
  { key: 'lastName', label: 'Last name', editable: false },
  { key: 'age', label: 'Age', editable: false },
  { key: 'hairColour', label: 'Hair colour', editable: false },
];

const DUMMY_ROWS: Person[] = [
  { firstName: 'Ada', lastName: 'Lovelace', age: 36, hairColour: 'Brown' },
  { firstName: 'Alan', lastName: 'Turing', age: 41, hairColour: 'Black' },
  { firstName: 'Grace', lastName: 'Hopper', age: 85, hairColour: 'White' },
];

/**
 * DataGrid
 *
 * A cross-framework web component built with Lit. Because it is a standard
 * custom element, it can be consumed from Angular, React, Vue, Svelte, or
 * plain HTML without framework-specific adapters.
 *
 * Interaction model:
 *   - Tab into the grid focuses the active cell.
 *   - Arrow keys move the active cell within the grid.
 *   - Enter on an editable cell enters edit mode.
 *   - Clicking a cell focuses it; clicking it again enters edit mode.
 *   - Enter commits the edit; Escape cancels it and returns to the button.
 *
 * Usage:
 *   <data-grid></data-grid>
 */
@customElement('data-grid')
export class DataGrid extends LitElement {
  // Styles live in ./data-grid.css so they are easy to read and edit.
  // `?inline` imports the file as a string; `unsafeCSS` wraps it for Lit.
  static override styles = unsafeCSS(styles);

  /**
   * Row data. Defaults to dummy data so the grid renders out of the box.
   * Replace with real data when wiring up a data source.
   */
  @property({ type: Array })
  data: Person[] = DUMMY_ROWS;

  /** The cell that currently owns the grid's tab stop. */
  @state()
  private activeCell: { row: number; col: number } = { row: 1, col: 0 };

  /** Whether the active cell is in edit mode. */
  @state()
  private editing = false;

  /** Draft value while editing. */
  @state()
  private editValue = '';

  /**
   * Whether the grid had focus before the current pointer interaction.
   *
   * Used to distinguish the first click on a cell (focus it) from a second
   * click on the already-focused cell (edit it). Captured on pointerdown,
   * before the browser moves focus.
   */
  private hadFocusBeforePointer = false;

  /** Header row plus one row per data item. */
  private get rowCount() {
    return this.data.length + 1;
  }

  override render() {
    return html`
      <div
        class="grid"
        role="grid"
        part="grid"
        @keydown=${this.handleKeyDown}
        @pointerdown=${this.handlePointerDown}
        @click=${this.handleClick}
      >
        <div class="row row--header" role="row" part="header">
          ${COLUMNS.map((column, colIndex) =>
            this.renderHeaderCell(column, colIndex)
          )}
        </div>
        ${this.data.map((person, rowIndex) =>
          this.renderDataRow(person, rowIndex)
        )}
      </div>
    `;
  }

  private renderHeaderCell(column: Column, colIndex: number) {
    const isActive =
      this.activeCell.row === 0 && this.activeCell.col === colIndex;
    return html`
      <div
        class="cell cell--header"
        role="columnheader"
        part="header-cell"
        tabindex=${isActive ? '0' : '-1'}
        data-row="0"
        data-col=${colIndex}
      >
        ${column.label}
      </div>
    `;
  }

  private renderDataRow(person: Person, rowIndex: number) {
    const gridRow = rowIndex + 1;
    return html`
      <div class="row" role="row" part="row">
        ${COLUMNS.map((column, colIndex) => {
          const isActive =
            this.activeCell.row === gridRow &&
            this.activeCell.col === colIndex;
          return html`
            <div
              class="cell"
              role="gridcell"
              part="cell"
              tabindex=${isActive ? '0' : '-1'}
              data-row=${gridRow}
              data-col=${colIndex}
            >
              ${this.renderCellContent(person, column, isActive)}
            </div>
          `;
        })}
      </div>
    `;
  }

  private renderCellContent(
    person: Person,
    column: Column,
    isActive: boolean
  ) {
    if (this.editing && isActive && column.editable) {
      return html`
        <span class="cell-placeholder" aria-hidden="true"
          >${person[column.key]}</span
        >
        <input
          class="cell-input"
          part="input"
          aria-label=${column.label}
          .value=${this.editValue}
          @input=${this.handleInput}
          @blur=${this.handleBlur}
        />
      `;
    }

    if (column.editable) {
      return html`<button
        class="cell-button"
        part="cell-button"
        type="button"
        tabindex="-1"
      >${person[column.key]}</button>`;
    }

    return person[column.key];
  }

  private handlePointerDown() {
    // In a shadow root, `document.activeElement` is the host element when a
    // shadow descendant has focus. This is more reliable than `:focus-within`
    // across browsers and test environments.
    this.hadFocusBeforePointer = document.activeElement === this;
  }

  private handleClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    const cell = target.closest<HTMLElement>('[data-row][data-col]');
    if (!cell) return;
    const row = Number(cell.dataset.row);
    const col = Number(cell.dataset.col);

    const isSameCell =
      row === this.activeCell.row && col === this.activeCell.col;

    // First click on a cell focuses it; a second click on the same cell edits.
    if (!isSameCell || !this.hadFocusBeforePointer) {
      this.activeCell = { row, col };
      this.focusActiveCell();
      return;
    }

    const column = COLUMNS[col];
    if (row > 0 && column?.editable) {
      this.startEdit();
    }
  }

  private handleKeyDown(event: KeyboardEvent) {
    if (this.editing) {
      if (event.key === 'Enter') {
        event.preventDefault();
        this.commitEdit(true);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        this.cancelEdit();
      }
      return;
    }

    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault();
        this.moveActiveCell(-1, 0);
        return;
      case 'ArrowDown':
        event.preventDefault();
        this.moveActiveCell(1, 0);
        return;
      case 'ArrowLeft':
        event.preventDefault();
        this.moveActiveCell(0, -1);
        return;
      case 'ArrowRight':
        event.preventDefault();
        this.moveActiveCell(0, 1);
        return;
      case 'Enter':
        event.preventDefault();
        this.startEdit();
        return;
    }
  }

  private moveActiveCell(rowDelta: number, colDelta: number) {
    const row = Math.max(
      0,
      Math.min(this.rowCount - 1, this.activeCell.row + rowDelta)
    );
    const col = Math.max(
      0,
      Math.min(COLUMNS.length - 1, this.activeCell.col + colDelta)
    );
    this.activeCell = { row, col };
    this.focusActiveCell();
  }

  private startEdit() {
    if (this.editing) return;
    const { row, col } = this.activeCell;
    if (row === 0) return;
    const column = COLUMNS[col];
    if (!column.editable) return;
    const person = this.data[row - 1];
    this.editing = true;
    this.editValue = String(person[column.key]);
    this.updateComplete.then(() => {
      const input =
        this.renderRoot.querySelector<HTMLInputElement>('.cell-input');
      input?.focus();
      input?.select();
    });
  }

  private commitEdit(refocus: boolean) {
    const { row, col } = this.activeCell;
    const column = COLUMNS[col];
    const rowIndex = row - 1;
    // Only string-valued columns are editable today, so the cast is safe.
    this.data = this.data.map((person, i) =>
      i === rowIndex
        ? ({ ...person, [column.key]: this.editValue } as Person)
        : person
    );
    this.editing = false;
    if (refocus) this.focusActiveCell();
  }

  private cancelEdit() {
    this.editing = false;
    this.focusActiveCell();
  }

  private handleInput(event: Event) {
    this.editValue = (event.target as HTMLInputElement).value;
  }

  private handleBlur() {
    // Commit when focus leaves the input (e.g. clicking elsewhere), but do not
    // steal focus back to the grid.
    if (this.editing) {
      this.commitEdit(false);
    }
  }

  private focusActiveCell() {
    this.updateComplete.then(() => {
      const cell = this.renderRoot.querySelector<HTMLElement>(
        `[data-row="${this.activeCell.row}"][data-col="${this.activeCell.col}"]`
      );
      cell?.focus();
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'data-grid': DataGrid;
  }
}
