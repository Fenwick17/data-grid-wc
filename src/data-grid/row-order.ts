/**
 * Row ordering helpers.
 *
 * `visualOrderFromDom` reads the order SortableJS left the DOM in; the array
 * helpers produce immutable edits for the row actions.
 */

import type { Person } from './types';

export type RowIdGetter = (person: Person) => number;

/** Maps stable row IDs to their Person objects. */
export function buildIdMap(
  data: readonly Person[],
  getId: RowIdGetter
): Map<number, Person> {
  const byId = new Map<number, Person>();
  for (const person of data) {
    byId.set(getId(person), person);
  }
  return byId;
}

/**
 * Reads the row order from the rendered DOM.
 *
 * SortableJS moves row elements directly, so the DOM is the source of truth
 * after a drag. Duplicate IDs (for example a lingering drag clone) are ignored.
 * Falls back to the data order when the DOM does not contain exactly one
 * element per row.
 */
export function visualOrderFromDom(
  container: Element | null,
  data: readonly Person[],
  getId: RowIdGetter
): Person[] {
  if (!container) return [...data];

  const byId = buildIdMap(data, getId);
  const ordered: Person[] = [];
  const seen = new Set<number>();

  for (const child of Array.from(container.children)) {
    const id = Number((child as HTMLElement).dataset.rowId);
    if (!Number.isFinite(id) || seen.has(id)) continue;
    const person = byId.get(id);
    if (!person) continue;
    seen.add(id);
    ordered.push(person);
  }

  return ordered.length === data.length ? ordered : [...data];
}

export function removeAt<T>(items: readonly T[], index: number): T[] {
  return items.filter((_, i) => i !== index);
}

export function insertAt<T>(items: readonly T[], index: number, item: T): T[] {
  return [...items.slice(0, index), item, ...items.slice(index)];
}

export function swapAt<T>(items: readonly T[], a: number, b: number): T[] {
  const next = [...items];
  [next[a], next[b]] = [next[b], next[a]];
  return next;
}
