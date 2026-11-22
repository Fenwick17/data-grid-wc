/**
 * Pure cell and menu-item templates.
 *
 * They take explicit inputs so they can be rendered and tested without a
 * component instance.
 */

import { html, type TemplateResult } from 'lit';
import type { Column, DataColumn, Person, RowAction } from './types';

/** Type-specific class applied to a column's cells. */
const COLUMN_CLASS: Record<Column['type'], string> = {
  handle: 'cell--handle',
  select: 'cell--select',
  actions: 'cell--actions',
  data: 'cell--data',
};

/** Builds the class list for a data cell. */
export function cellClasses(column: Column, isEditing: boolean): string {
  return ['cell', COLUMN_CLASS[column.type], isEditing ? 'cell--editing' : '']
    .filter(Boolean)
    .join(' ');
}

export function renderHeaderCell(
  column: Column,
  colIndex: number,
  isActive: boolean
): TemplateResult {
  return html`
    <div
      class="cell cell--header ${COLUMN_CLASS[column.type]}"
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

export function renderHandleCell(): TemplateResult {
  // Purely a pointer affordance: hidden from assistive tech and never
  // focusable. Reordering is also available from the actions menu.
  return html`
    <div class="cell-handle" part="handle" aria-hidden="true">⋮⋮</div>
  `;
}

export function renderSelectCell(person: Person): TemplateResult {
  return html`<input
    class="cell-checkbox"
    part="checkbox"
    type="checkbox"
    tabindex="-1"
    aria-label=${`Select ${person.firstName} ${person.lastName}`}
  />`;
}

export function renderPlaceholder(
  person: Person,
  column: DataColumn
): TemplateResult {
  return html`<span class="cell-placeholder" aria-hidden="true"
    >${person[column.key]}</span
  >`;
}

export function renderEditableCell(
  person: Person,
  column: DataColumn
): TemplateResult {
  return html`<button
    class="cell-button"
    part="cell-button"
    type="button"
    tabindex="-1"
  >${person[column.key]}</button>`;
}

export function renderMenuItem(
  label: string,
  action: RowAction,
  disabled: boolean,
  onAction: (event: Event, action: RowAction) => void,
  onHover: (event: Event) => void
): TemplateResult {
  return html`<button
    class="cell-menu-item"
    part="menu-item"
    role="menuitem"
    type="button"
    tabindex="-1"
    ?disabled=${disabled}
    @click=${(event: Event) => onAction(event, action)}
    @mouseenter=${onHover}
  >${label}</button>`;
}
