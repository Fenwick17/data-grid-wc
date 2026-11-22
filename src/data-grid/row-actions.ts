/**
 * Pure row actions.
 *
 * Each function returns the new row order and the active cell's new row (or
 * null when the action does not affect it), so the component only has to apply
 * the result.
 */

import type { Person } from './types';
import { insertAt, removeAt, swapAt } from './row-order';

/**
 * The outcome of a row action.
 *
 * `activeRow` is the active cell's new row, or null when the action does not
 * affect it. `data` is always the new row order.
 */
export interface RowActionResult {
  data: Person[];
  activeRow: number | null;
}

export function deleteRow(
  ordered: readonly Person[],
  index: number,
  activeRow: number
): RowActionResult {
  const data = removeAt(ordered, index);
  const row = index + 1;
  let nextActive: number | null = null;
  if (activeRow === row) {
    // Stay on the row that took the deleted row's place, or fall back to the
    // header when the grid is now empty.
    nextActive = Math.min(row, data.length);
  } else if (activeRow > row) {
    nextActive = activeRow - 1;
  }
  return { data, activeRow: nextActive };
}

export function duplicateRow(
  ordered: readonly Person[],
  index: number,
  activeRow: number
): RowActionResult {
  const copy = { ...ordered[index] };
  const data = insertAt(ordered, index + 1, copy);
  return {
    data,
    activeRow: activeRow > index + 1 ? activeRow + 1 : null,
  };
}

export function addRowBelow(
  ordered: readonly Person[],
  index: number,
  activeRow: number,
  blank: Person
): RowActionResult {
  const data = insertAt(ordered, index + 1, blank);
  return {
    data,
    activeRow: activeRow > index + 1 ? activeRow + 1 : null,
  };
}

export function moveRowUp(
  ordered: readonly Person[],
  index: number,
  activeRow: number
): RowActionResult | null {
  if (index <= 0) return null;
  const data = swapAt(ordered, index - 1, index);
  const row = index + 1;
  let nextActive: number | null = null;
  if (activeRow === row) {
    nextActive = row - 1;
  } else if (activeRow === row - 1) {
    nextActive = row;
  }
  return { data, activeRow: nextActive };
}

export function moveRowDown(
  ordered: readonly Person[],
  index: number,
  activeRow: number
): RowActionResult | null {
  if (index >= ordered.length - 1) return null;
  const data = swapAt(ordered, index, index + 1);
  const row = index + 1;
  let nextActive: number | null = null;
  if (activeRow === row) {
    nextActive = row + 1;
  } else if (activeRow === row + 1) {
    nextActive = row;
  }
  return { data, activeRow: nextActive };
}
