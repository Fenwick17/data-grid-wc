import { LitElement, html, unsafeCSS } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import Sortable from 'sortablejs';
import styles from './data-grid.css?inline';
import {
  COLUMNS,
  DUMMY_ROWS,
  JOB_STATUSES,
  blankRow,
  filterJobStatuses,
  findExactJobStatus,
  type Column,
  type DataColumn,
  type JobStatus,
  type Person,
  type RowAction,
} from './data-grid/types';
import { RowIdRegistry } from './data-grid/row-ids';
import { buildIdMap, visualOrderFromDom } from './data-grid/row-order';
import {
  addRowBelow,
  deleteRow,
  duplicateRow,
  moveRowDown,
  moveRowUp,
  type RowActionResult,
} from './data-grid/row-actions';
import {
  clampCell,
  cycleIndex,
  nextCellByArrow,
  nextCellByTab,
  type CellPosition,
} from './data-grid/navigation';
import {
  positionCombobox as anchorCombobox,
  positionMenu as anchorMenu,
  positionTextarea as anchorTextarea,
} from './data-grid/positioning';
import {
  cellClasses,
  renderEditableCell,
  renderHandleCell,
  renderHeaderCell,
  renderMenuItem,
  renderPlaceholder,
  renderSelectCell,
} from './data-grid/render';

export type { JobStatus, Person } from './data-grid/types';

/** True for columns keyboard navigation should skip. */
const isSkippedColumn = (col: number) => COLUMNS[col].type === 'handle';

/**
 * DataGrid
 *
 * A cross-framework web component built with Lit. Because it is a standard
 * custom element, it can be consumed from Angular, React, Vue, Svelte, or
 * plain HTML without framework-specific adapters.
 *
 * Interaction model:
 *   - Tab / arrow keys move the active cell (configurable via `navigation`).
 *   - Enter or a second click enters edit mode on editable cells.
 *   - Enter commits; Escape cancels.
 *   - The selection column toggles a per-row checkbox.
 *   - The actions column opens a floating menu.
 *   - Rows can be reordered by dragging the handle in the first column.
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
  data: Person[] = [...DUMMY_ROWS];

  /**
   * Which keys move the active cell.
   *
   * - `'arrows'`: arrow keys only; Tab leaves the grid.
   * - `'tab'`: Tab / Shift+Tab only.
   * - `'both'`: arrow keys and Tab.
   */
  @property({ type: String })
  navigation: 'arrows' | 'tab' | 'both' = 'both';

  private get arrowsEnabled() {
    return this.navigation !== 'tab';
  }

  private get tabEnabled() {
    return this.navigation !== 'arrows';
  }

  /** The cell that currently owns the grid's tab stop. */
  @state()
  private activeCell: CellPosition = { row: 1, col: 1 };

  /** Whether the active cell is in edit mode. */
  @state()
  private editing = false;

  /** Draft value while editing. */
  @state()
  private editValue = '';

  /**
   * Row whose actions menu is open, or null when closed. Tracked by the row's
   * stable identity rather than its position so drag-reordering cannot leave
   * the menu pointing at the wrong row.
   */
  @state()
  private openMenuPerson: Person | null = null;

  /** Cleanup for the menu's Floating UI auto-update loop. */
  private menuCleanup: (() => void) | null = null;

  /** Highlighted option index in the combobox editor. */
  @state()
  private comboboxActiveIndex = -1;

  /** Filter text for the combobox options. Empty shows all options. */
  @state()
  private comboboxFilter = '';

  /** Cleanup for the combobox's Floating UI auto-update loop. */
  private comboboxCleanup: (() => void) | null = null;

  /** Cleanup for the textarea's Floating UI auto-update loop. */
  private textareaCleanup: (() => void) | null = null;

  /**
   * Whether the grid had focus before the current pointer interaction.
   *
   * Used to distinguish the first click on a cell (focus it) from a second
   * click on the already-focused cell (edit it). Captured on pointerdown,
   * before the browser moves focus.
   */
  private hadFocusBeforePointer = false;

  /** Stable row IDs for keying `repeat` and identifying rows in the DOM. */
  private rowIds = new RowIdRegistry();

  /** SortableJS instance for row drag-and-drop. */
  private sortable: Sortable | null = null;

  /**
   * Bumped after a drag so `repeat` rebuilds the rows. SortableJS moves nodes
   * directly, which can leave a row element stranded outside Lit's marker
   * comments; a fresh generation re-anchors every row.
   */
  @state()
  private rowGeneration = 0;

  /** Header row plus one row per data item. */
  private get rowCount() {
    return this.data.length + 1;
  }

  private getRowId(person: Person): number {
    return this.rowIds.get(person);
  }

  override render() {
    return html`
      <div
        class="grid"
        role="grid"
        part="grid"
        aria-rowcount=${this.rowCount}
        aria-colcount=${COLUMNS.length}
        @keydown=${this.handleKeyDown}
        @pointerdown=${this.handlePointerDown}
        @click=${this.handleClick}
      >
        <div class="row row--header" role="row" part="header">
          ${COLUMNS.map((column, colIndex) =>
            renderHeaderCell(
              column,
              colIndex,
              this.activeCell.row === 0 && this.activeCell.col === colIndex
            )
          )}
        </div>
        <div class="rows" part="rows">
          ${repeat(
            this.data,
            (person) => `${this.rowGeneration}-${this.getRowId(person)}`,
            (person, rowIndex) => this.renderDataRow(person, rowIndex)
          )}
        </div>
      </div>
    `;
  }

  private renderDataRow(person: Person, rowIndex: number) {
    const gridRow = rowIndex + 1;
    return html`
      <div
        class="row"
        role="row"
        part="row"
        data-row-id=${this.getRowId(person)}
      >
        ${COLUMNS.map((column, colIndex) => {
          const isActive =
            this.activeCell.row === gridRow &&
            this.activeCell.col === colIndex;
          const isEditing =
            this.editing &&
            isActive &&
            column.type === 'data' &&
            column.editable;
          return html`
            <div
              class=${cellClasses(column, isEditing)}
              role="gridcell"
              part="cell"
              tabindex=${isActive ? '0' : '-1'}
              data-row=${gridRow}
              data-col=${colIndex}
            >
              ${this.renderCellContent(person, column, isEditing, gridRow)}
            </div>
          `;
        })}
      </div>
    `;
  }

  private renderCellContent(
    person: Person,
    column: Column,
    isEditing: boolean,
    row: number
  ) {
    if (column.type === 'handle') return renderHandleCell();
    if (column.type === 'select') return renderSelectCell(person);
    if (column.type === 'actions') return this.renderActionsCell(person, row);
    if (isEditing) return this.renderEditor(person, column);
    if (column.editable) return renderEditableCell(person, column);
    return person[column.key];
  }

  private renderActionsCell(person: Person, row: number) {
    const isOpen = this.openMenuPerson === person;
    const index = row - 1;
    const isFirst = index === 0;
    const isLast = index === this.data.length - 1;
    const menuId = `menu-${this.getRowId(person)}`;
    const item = (label: string, action: RowAction, disabled = false) =>
      renderMenuItem(
        label,
        action,
        disabled,
        this.handleRowAction,
        this.handleMenuItemHover
      );
    return html`
      <button
        class="cell-menu-button"
        part="menu-button"
        type="button"
        tabindex="-1"
        aria-label="Actions"
        aria-haspopup="menu"
        aria-expanded=${isOpen ? 'true' : 'false'}
        aria-controls=${menuId}
        @click=${(event: Event) => this.toggleMenu(event, person)}
      >
        ⋮
      </button>
      ${isOpen
        ? html`
            <div
              class="cell-menu"
              part="menu"
              role="menu"
              id=${menuId}
              @click=${this.stopPropagation}
            >
              ${item('Delete row', 'delete')}
              ${item('Duplicate row', 'duplicate')}
              ${item('Add row below', 'addBelow')}
              ${item('Move up', 'moveUp', isFirst)}
              ${item('Move down', 'moveDown', isLast)}
            </div>
          `
        : null}
    `;
  }

  private renderEditor(person: Person, column: DataColumn) {
    if (column.editor === 'combobox') {
      return this.renderCombobox(person, column);
    }

    const field =
      column.editor === 'textarea'
        ? html`<textarea
            class="cell-textarea"
            part="textarea"
            aria-label=${column.label}
            .value=${this.editValue}
            @input=${this.handleInput}
            @blur=${this.handleBlur}
          ></textarea>`
        : html`<input
            class="cell-input"
            part="input"
            aria-label=${column.label}
            .value=${this.editValue}
            @input=${this.handleInput}
            @blur=${this.handleBlur}
          />`;
    return html`${renderPlaceholder(person, column)} ${field}`;
  }

  private renderCombobox(person: Person, column: DataColumn) {
    const row = this.activeCell.row;
    const listboxId = `combobox-${row}`;
    const options = this.comboboxOptions;
    return html`
      ${renderPlaceholder(person, column)}
      <input
        class="cell-input"
        part="input"
        role="combobox"
        aria-label=${column.label}
        aria-autocomplete="list"
        aria-expanded="true"
        aria-controls=${listboxId}
        aria-activedescendant=${this.comboboxActiveIndex >= 0
          ? `${listboxId}-option-${this.comboboxActiveIndex}`
          : undefined}
        .value=${this.editValue}
        @input=${this.handleComboboxInput}
        @blur=${this.handleBlur}
      />
      <div
        class="cell-combobox"
        part="combobox"
        role="listbox"
        id=${listboxId}
        @mousedown=${this.preventDefault}
      >
        ${options.map(
          (option, index) => html`
            <div
              class="cell-combobox-option"
              part="combobox-option"
              role="option"
              id=${`${listboxId}-option-${index}`}
              aria-selected=${option === this.editValue}
              data-active=${index === this.comboboxActiveIndex}
              @click=${() => this.selectComboboxOption(option)}
            >
              ${option}
            </div>
          `
        )}
      </div>
    `;
  }

  private get comboboxOptions(): JobStatus[] {
    return filterJobStatuses(this.comboboxFilter);
  }

  private preventDefault(event: Event) {
    event.preventDefault();
  }

  private stopPropagation(event: Event) {
    event.stopPropagation();
  }

  private handlePointerDown() {
    // In a shadow root, `document.activeElement` is the host element when a
    // shadow descendant has focus. This is more reliable than `:focus-within`
    // across browsers and test environments.
    this.hadFocusBeforePointer = document.activeElement === this;
  }

  private handleClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    // The drag handle is not a focusable/editable cell.
    if (target.closest('.cell-handle')) return;
    const cell = target.closest<HTMLElement>('[data-row][data-col]');
    if (!cell) return;
    const row = Number(cell.dataset.row);
    const col = Number(cell.dataset.col);
    if (COLUMNS[col]?.type === 'handle') return;

    const isSameCell =
      row === this.activeCell.row && col === this.activeCell.col;

    // First click on a cell focuses it; a second click on the same cell edits.
    if (!isSameCell || !this.hadFocusBeforePointer) {
      this.activeCell = { row, col };
      this.focusActiveCell();
      return;
    }

    const column = COLUMNS[col];
    if (row > 0 && column?.type === 'data' && column.editable) {
      this.startEdit();
    }
  }

  private handleKeyDown(event: KeyboardEvent) {
    if (this.openMenuPerson !== null) {
      this.handleMenuKeyDown(event);
      return;
    }

    if (this.editing) {
      if (this.isEditingCombobox()) {
        this.handleComboboxKeyDown(event);
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        this.cancelEdit();
      } else if (event.key === 'Enter' && !this.isEditingTextarea()) {
        event.preventDefault();
        this.commitEdit(true);
      }
      return;
    }

    if (event.key.startsWith('Arrow') && !this.arrowsEnabled) return;

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
      case 'Tab':
        if (
          this.tabEnabled &&
          this.moveActiveCellByTab(event.shiftKey ? -1 : 1)
        ) {
          event.preventDefault();
        }
        return;
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.activateActiveCell();
        return;
    }
  }

  /**
   * Moves the active cell one step in row-major order. Returns false at the
   * boundary so the browser's default Tab can move focus out of the grid.
   */
  private moveActiveCellByTab(direction: number): boolean {
    const next = nextCellByTab(
      this.activeCell,
      this.rowCount,
      COLUMNS.length,
      direction > 0 ? 1 : -1,
      isSkippedColumn
    );
    if (!next) return false;
    this.activeCell = next;
    this.focusActiveCell();
    return true;
  }

  private activateActiveCell() {
    const { row, col } = this.activeCell;
    if (row === 0) return;
    const column = COLUMNS[col];
    if (column.type === 'handle') return;
    if (column.type === 'select') {
      this.toggleCheckbox();
    } else if (column.type === 'actions') {
      const person = this.data[row - 1];
      if (this.openMenuPerson === person) {
        this.closeMenu();
      } else {
        this.openMenu(person);
      }
    } else if (column.type === 'data' && column.editable) {
      this.startEdit();
    }
  }

  private toggleCheckbox() {
    const { row, col } = this.activeCell;
    if (row === 0) return;
    const column = COLUMNS[col];
    if (column.type !== 'select') return;
    const checkbox = this.renderRoot.querySelector<HTMLInputElement>(
      `[data-row="${row}"][data-col="${col}"] .cell-checkbox`
    );
    if (checkbox) {
      checkbox.checked = !checkbox.checked;
    }
  }

  private moveActiveCell(rowDelta: number, colDelta: number) {
    this.activeCell = nextCellByArrow(
      this.activeCell,
      this.rowCount,
      COLUMNS.length,
      rowDelta,
      colDelta,
      isSkippedColumn
    );
    this.focusActiveCell();
  }

  private startEdit() {
    if (this.editing) return;
    const { row, col } = this.activeCell;
    if (row === 0) return;
    const column = COLUMNS[col];
    if (column.type !== 'data' || !column.editable) return;
    const person = this.data[row - 1];
    this.editing = true;
    this.editValue = String(person[column.key]);
    if (column.editor === 'combobox') {
      this.comboboxFilter = '';
      this.comboboxActiveIndex = Math.max(
        0,
        JOB_STATUSES.indexOf(this.editValue as JobStatus)
      );
    }
    this.updateComplete.then(() => {
      const field = this.renderRoot.querySelector<
        HTMLInputElement | HTMLTextAreaElement
      >('.cell-input, .cell-textarea');
      field?.focus();
      field?.select();
    });
  }

  private isEditingTextarea() {
    const column = COLUMNS[this.activeCell.col];
    return column.type === 'data' && column.editor === 'textarea';
  }

  private isEditingCombobox() {
    const column = COLUMNS[this.activeCell.col];
    return column.type === 'data' && column.editor === 'combobox';
  }

  private commitEdit(refocus: boolean) {
    const { row, col } = this.activeCell;
    const column = COLUMNS[col];
    if (column.type !== 'data') return;
    const rowIndex = row - 1;
    const previous = this.data[rowIndex];
    // Only string-valued columns are editable today, so the cast is safe.
    const updated = { ...previous, [column.key]: this.editValue } as Person;
    // Carry the stable row ID over so Lit keeps the same DOM node.
    this.rowIds.transfer(previous, updated);
    this.data = this.data.map((person, i) =>
      i === rowIndex ? updated : person
    );
    this.emitDataChange();
    this.editing = false;
    this.comboboxActiveIndex = -1;
    this.comboboxFilter = '';
    this.comboboxCleanup?.();
    this.comboboxCleanup = null;
    this.textareaCleanup?.();
    this.textareaCleanup = null;
    if (refocus) this.focusActiveCell();
  }

  private cancelEdit(refocus = true) {
    this.editing = false;
    this.comboboxActiveIndex = -1;
    this.comboboxFilter = '';
    this.comboboxCleanup?.();
    this.comboboxCleanup = null;
    this.textareaCleanup?.();
    this.textareaCleanup = null;
    if (refocus) this.focusActiveCell();
  }

  private handleInput(event: Event) {
    this.editValue = (
      event.target as HTMLInputElement | HTMLTextAreaElement
    ).value;
  }

  private handleComboboxInput(event: Event) {
    this.editValue = (event.target as HTMLInputElement).value;
    this.comboboxFilter = this.editValue;
    this.comboboxActiveIndex = this.comboboxOptions.length > 0 ? 0 : -1;
  }

  private handleComboboxKeyDown(event: KeyboardEvent) {
    const options = this.comboboxOptions;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.comboboxActiveIndex = cycleIndex(
          this.comboboxActiveIndex,
          options.length,
          1
        );
        return;
      case 'ArrowUp':
        event.preventDefault();
        this.comboboxActiveIndex = cycleIndex(
          this.comboboxActiveIndex,
          options.length,
          -1
        );
        return;
      case 'Enter':
        event.preventDefault();
        this.commitCombobox(options);
        return;
      case 'Escape':
        event.preventDefault();
        this.cancelEdit();
        return;
    }
  }

  private commitCombobox(options: JobStatus[]) {
    const active = options[this.comboboxActiveIndex];
    if (active) {
      this.editValue = active;
    } else {
      const exact = findExactJobStatus(this.editValue);
      if (!exact) {
        this.cancelEdit();
        return;
      }
      this.editValue = exact;
    }
    this.commitEdit(true);
  }

  private selectComboboxOption(option: JobStatus) {
    this.editValue = option;
    this.commitEdit(true);
  }

  private handleBlur() {
    // Commit when focus leaves the editor, but do not steal focus back.
    if (!this.editing) return;
    if (this.isEditingCombobox()) {
      const exact = findExactJobStatus(this.editValue);
      if (exact) {
        this.editValue = exact;
        this.commitEdit(false);
      } else {
        this.cancelEdit(false);
      }
      return;
    }
    this.commitEdit(false);
  }

  private toggleMenu(event: Event, person: Person) {
    event.stopPropagation();
    if (this.openMenuPerson === person) {
      this.closeMenu();
      return;
    }
    this.openMenu(person);
  }

  private openMenu(person: Person) {
    this.openMenuPerson = person;
    this.updateComplete.then(() => {
      if (this.openMenuPerson !== person) return;
      this.focusFirstMenuItem(person);
      document.addEventListener('click', this.handleDocumentClick);
    });
  }

  private closeMenu(refocus = true) {
    const person = this.openMenuPerson;
    this.openMenuPerson = null;
    this.menuCleanup?.();
    this.menuCleanup = null;
    document.removeEventListener('click', this.handleDocumentClick);
    if (refocus && person !== null) {
      const rowId = this.getRowId(person);
      this.updateComplete.then(() => {
        this.renderRoot
          .querySelector<HTMLElement>(
            `[data-row-id="${rowId}"] .cell-menu-button`
          )
          ?.focus();
      });
    }
  }

  private positionMenu(person: Person) {
    const rowId = this.getRowId(person);
    const button = this.renderRoot.querySelector<HTMLElement>(
      `[data-row-id="${rowId}"] .cell-menu-button`
    );
    const menu = this.renderRoot.querySelector<HTMLElement>(
      `[data-row-id="${rowId}"] .cell-menu`
    );
    if (!button || !menu) return;

    this.menuCleanup?.();
    this.menuCleanup = anchorMenu(button, menu);
  }

  private focusFirstMenuItem(person: Person) {
    const rowId = this.getRowId(person);
    this.renderRoot
      .querySelector<HTMLElement>(
        `[data-row-id="${rowId}"] .cell-menu-item:not([disabled])`
      )
      ?.focus();
  }

  private handleRowAction = (event: Event, action: RowAction) => {
    event.stopPropagation();
    // Identify the row by the stable ID on the DOM, not by a cached object.
    // After a drag the cached object can point at a row that has since moved.
    const target = event.target as HTMLElement;
    const rowElement = target.closest<HTMLElement>('[data-row-id]');
    if (!rowElement) return;
    const rowId = Number(rowElement.dataset.rowId);

    // Operate on the visual order, not `this.data`. SortableJS moves DOM nodes
    // directly, so the data array can lag behind what the user sees.
    const ordered = this.getVisualOrder();
    const index = ordered.findIndex((item) => this.getRowId(item) === rowId);
    if (index === -1) return;

    switch (action) {
      case 'delete':
        this.applyRowResult(deleteRow(ordered, index, this.activeCell.row));
        break;
      case 'duplicate':
        this.applyRowResult(duplicateRow(ordered, index, this.activeCell.row));
        break;
      case 'addBelow':
        this.applyRowResult(
          addRowBelow(ordered, index, this.activeCell.row, blankRow())
        );
        break;
      case 'moveUp':
        this.applyRowResult(moveRowUp(ordered, index, this.activeCell.row));
        break;
      case 'moveDown':
        this.applyRowResult(moveRowDown(ordered, index, this.activeCell.row));
        break;
    }
  };

  /**
   * Returns the rows in the order they are rendered. SortableJS moves DOM nodes
   * directly, so this is the source of truth after a drag.
   */
  private getVisualOrder(): Person[] {
    const container = this.renderRoot.querySelector<HTMLElement>('.rows');
    return visualOrderFromDom(container, this.data, (person) =>
      this.getRowId(person)
    );
  }

  private applyRowResult(result: RowActionResult | null) {
    if (!result) return;
    this.data = result.data;
    this.emitDataChange();
    if (result.activeRow !== null) {
      this.activeCell = { ...this.activeCell, row: result.activeRow };
    }
    this.finishRowAction();
  }

  /**
   * Notifies consumers that the rows changed through user interaction. Fired
   * for edits, add/delete/duplicate, move up/down, and drag reordering, so a
   * host framework can keep its own copy of the data in sync.
   */
  private emitDataChange() {
    this.dispatchEvent(
      new CustomEvent('data-change', {
        detail: { data: this.data },
        bubbles: true,
        composed: true,
      })
    );
  }

  private finishRowAction() {
    this.closeMenu(false);
    this.clampActiveCell();
    this.focusActiveCell();
  }

  private clampActiveCell() {
    const next = clampCell(
      this.activeCell,
      this.rowCount,
      COLUMNS.length,
      isSkippedColumn
    );
    if (next.row !== this.activeCell.row || next.col !== this.activeCell.col) {
      this.activeCell = next;
    }
  }

  private handleMenuItemHover(event: Event) {
    (event.currentTarget as HTMLElement).focus({ preventScroll: true });
  }

  private handleMenuKeyDown(event: KeyboardEvent) {
    const person = this.openMenuPerson;
    if (!person) return;
    const rowId = this.getRowId(person);
    const menu = this.renderRoot.querySelector<HTMLElement>(
      `[data-row-id="${rowId}"] .cell-menu`
    );
    if (!menu) return;
    const items = Array.from(
      menu.querySelectorAll<HTMLElement>('.cell-menu-item:not([disabled])')
    );
    if (items.length === 0) return;

    const active = this.shadowRoot?.activeElement as HTMLElement | null;
    const currentIndex = active ? items.indexOf(active) : -1;

    switch (event.key) {
      case 'ArrowDown': {
        event.preventDefault();
        items[cycleIndex(currentIndex, items.length, 1)]?.focus();
        return;
      }
      case 'ArrowUp': {
        event.preventDefault();
        items[cycleIndex(currentIndex, items.length, -1)]?.focus();
        return;
      }
      case 'Home':
        event.preventDefault();
        items[0]?.focus();
        return;
      case 'End':
        event.preventDefault();
        items[items.length - 1]?.focus();
        return;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (currentIndex >= 0) {
          items[currentIndex]?.click();
        }
        return;
      case 'Escape':
        event.preventDefault();
        this.closeMenu();
        return;
      case 'Tab':
        this.closeMenu(false);
        return;
    }
  }

  private handleDocumentClick = (event: MouseEvent) => {
    if (this.openMenuPerson === null) return;
    const rowId = this.getRowId(this.openMenuPerson);
    const path = event.composedPath();
    const menu = this.renderRoot.querySelector(
      `[data-row-id="${rowId}"] .cell-menu`
    );
    const button = this.renderRoot.querySelector(
      `[data-row-id="${rowId}"] .cell-menu-button`
    );
    if (menu && path.includes(menu)) return;
    if (button && path.includes(button)) return;
    this.closeMenu(false);
  };

  override firstUpdated() {
    this.initSortable();
  }

  private initSortable() {
    const rowsContainer = this.renderRoot.querySelector<HTMLElement>('.rows');
    if (!rowsContainer) return;

    this.sortable = Sortable.create(rowsContainer, {
      handle: '.cell-handle',
      animation: 150,
      ghostClass: 'row-ghost',
      chosenClass: 'row-chosen',
      dragClass: 'row-drag',
      onEnd: (event) => {
        const container = this.renderRoot.querySelector<HTMLElement>('.rows');
        if (!container) return;

        // Derive the order from the DOM the user actually dropped into.
        const ordered = this.getVisualOrder();
        const byId = buildIdMap(this.data, (person) => this.getRowId(person));
        const movedId = Number(
          (event.item as HTMLElement | undefined)?.dataset.rowId
        );

        if (this.applyRowOrder(ordered, byId.get(movedId))) {
          // Drop the moved row elements before rebuilding. SortableJS moved
          // them out from between Lit's markers, so `repeat` cannot remove
          // them itself and would otherwise leave duplicates behind.
          for (const child of Array.from(container.children)) {
            child.remove();
          }
          this.rowGeneration++;
        }
      },
    });
  }

  /**
   * Applies a new row order, keeping the active cell attached to the same row.
   * Returns true when the order actually changed.
   */
  private applyRowOrder(next: Person[], movedPerson?: Person): boolean {
    const previous = this.data;
    if (
      next.length === previous.length &&
      next.every((person, index) => person === previous[index])
    ) {
      return false;
    }

    const activePerson =
      this.activeCell.row > 0 ? previous[this.activeCell.row - 1] : null;

    const oldIndex = movedPerson ? previous.indexOf(movedPerson) : -1;
    const newIndex = movedPerson ? next.indexOf(movedPerson) : -1;

    this.data = next;

    // Keep the active cell attached to the same row identity.
    if (activePerson) {
      const activeIndex = next.indexOf(activePerson);
      if (activeIndex >= 0) {
        this.activeCell = { ...this.activeCell, row: activeIndex + 1 };
      }
    }

    this.clampActiveCell();
    this.focusActiveCell();
    this.emitDataChange();
    this.dispatchEvent(
      new CustomEvent('row-reorder', {
        detail: { oldIndex, newIndex, data: this.data },
        bubbles: true,
        composed: true,
      })
    );
    return true;
  }

  override updated() {
    if (this.openMenuPerson !== null) {
      this.positionMenu(this.openMenuPerson);
    }
    if (this.editing && this.isEditingCombobox()) {
      this.positionCombobox(this.activeCell.row);
    }
    if (this.editing && this.isEditingTextarea()) {
      this.positionTextarea(this.activeCell.row, this.activeCell.col);
    }
  }

  private positionTextarea(row: number, col: number) {
    const cell = this.renderRoot.querySelector<HTMLElement>(
      `[data-row="${row}"][data-col="${col}"]`
    );
    const textarea = this.renderRoot.querySelector<HTMLElement>(
      `[data-row="${row}"][data-col="${col}"] .cell-textarea`
    );
    if (!cell || !textarea) return;

    this.textareaCleanup?.();
    this.textareaCleanup = anchorTextarea(cell, textarea);
  }

  private positionCombobox(row: number) {
    const input = this.renderRoot.querySelector<HTMLElement>(
      `[data-row="${row}"][data-col="${this.activeCell.col}"] .cell-input`
    );
    const listbox = this.renderRoot.querySelector<HTMLElement>(
      `[data-row="${row}"][data-col="${this.activeCell.col}"] .cell-combobox`
    );
    if (!input || !listbox) return;

    this.comboboxCleanup?.();
    this.comboboxCleanup = anchorCombobox(input, listbox);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.sortable?.destroy();
    this.sortable = null;
    this.openMenuPerson = null;
    this.menuCleanup?.();
    this.menuCleanup = null;
    this.comboboxCleanup?.();
    this.comboboxCleanup = null;
    this.textareaCleanup?.();
    this.textareaCleanup = null;
    document.removeEventListener('click', this.handleDocumentClick);
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
