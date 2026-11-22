import type { Person } from './types';

/**
 * Assigns a stable numeric ID to each row object.
 *
 * IDs survive reordering and are carried across edits, so Lit's keyed `repeat`
 * directive can reconcile rows and the actions menu can identify a row by
 * identity rather than by its current position.
 */
export class RowIdRegistry {
  private ids = new WeakMap<Person, number>();
  private next = 0;

  get(person: Person): number {
    let id = this.ids.get(person);
    if (id === undefined) {
      id = this.next++;
      this.ids.set(person, id);
    }
    return id;
  }

  /** Carries the ID from one object to its replacement. */
  transfer(from: Person, to: Person): void {
    const id = this.ids.get(from);
    if (id !== undefined) {
      this.ids.set(to, id);
    }
  }
}
