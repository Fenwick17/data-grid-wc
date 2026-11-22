/**
 * Keyboard navigation helpers.
 *
 * These are pure functions over a `CellPosition` so the movement rules can be
 * tested without a component instance.
 */

export interface CellPosition {
  row: number;
  col: number;
}

/** Returns true when a column should be skipped by keyboard navigation. */
export type ColumnSkipper = (col: number) => boolean;

/**
 * Moves one step in row-major order, skipping columns.
 *
 * Returns null at the boundary so the browser's default Tab can move focus out
 * of the grid.
 */
export function nextCellByTab(
  active: CellPosition,
  totalRows: number,
  totalCols: number,
  direction: 1 | -1,
  skip: ColumnSkipper
): CellPosition | null {
  let nextIndex = active.row * totalCols + active.col + direction;
  while (nextIndex >= 0 && nextIndex < totalRows * totalCols) {
    const row = Math.floor(nextIndex / totalCols);
    const col = nextIndex % totalCols;
    if (!skip(col)) return { row, col };
    nextIndex += direction;
  }
  return null;
}

/** Moves by a row/column delta, clamping to the grid and skipping columns. */
export function nextCellByArrow(
  active: CellPosition,
  totalRows: number,
  totalCols: number,
  rowDelta: number,
  colDelta: number,
  skip: ColumnSkipper
): CellPosition {
  const row = Math.max(0, Math.min(totalRows - 1, active.row + rowDelta));
  let col = active.col + colDelta;
  // Only scan horizontally when actually moving horizontally; a zero delta
  // would otherwise loop forever on a skipped column.
  if (colDelta !== 0) {
    while (col >= 0 && col < totalCols && skip(col)) {
      col += colDelta;
    }
  }
  col = Math.max(0, Math.min(totalCols - 1, col));
  return { row, col };
}

/**
 * Cycles a highlighted index within a list, wrapping at the ends. Returns -1
 * for an empty list.
 */
export function cycleIndex(
  current: number,
  length: number,
  direction: 1 | -1
): number {
  if (length === 0) return -1;
  if (current < 0) return direction > 0 ? 0 : length - 1;
  return (current + direction + length) % length;
}

/** Clamps a cell into the grid and off any skipped column. */
export function clampCell(
  active: CellPosition,
  totalRows: number,
  totalCols: number,
  skip: ColumnSkipper
): CellPosition {
  const row = Math.min(active.row, totalRows - 1);
  let col = Math.min(active.col, totalCols - 1);
  if (skip(col)) {
    col = Math.min(col + 1, totalCols - 1);
  }
  return { row, col };
}
