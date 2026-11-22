import {
  autoUpdate,
  computePosition,
  flip,
  offset,
  shift,
} from '@floating-ui/dom';

/**
 * Positions a menu below-end of its trigger and keeps it updated.
 * Returns the `autoUpdate` cleanup function.
 */
export function positionMenu(
  button: HTMLElement,
  menu: HTMLElement
): () => void {
  return autoUpdate(button, menu, () => {
    computePosition(button, menu, {
      placement: 'bottom-end',
      strategy: 'fixed',
      middleware: [offset(4), flip(), shift({ padding: 8 })],
    }).then(({ x, y }) => {
      Object.assign(menu.style, {
        left: `${x}px`,
        top: `${y}px`,
        opacity: '1',
      });
    });
  });
}

/**
 * Anchors a floating textarea to the cell's top-left corner and keeps it
 * updated. Returns the `autoUpdate` cleanup function.
 */
export function positionTextarea(
  cell: HTMLElement,
  textarea: HTMLElement
): () => void {
  // Size it to the cell once; the user can resize it afterwards.
  if (!textarea.style.width) {
    textarea.style.width = `${cell.getBoundingClientRect().width}px`;
  }

  // A zero-height virtual reference at the cell's top-left anchors the
  // textarea's top-left corner to the cell's top-left corner.
  const reference = {
    getBoundingClientRect: () => {
      const rect = cell.getBoundingClientRect();
      return {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: 0,
        top: rect.top,
        right: rect.right,
        bottom: rect.top,
        left: rect.left,
      };
    },
  };

  return autoUpdate(reference, textarea, () => {
    computePosition(reference, textarea, {
      placement: 'bottom-start',
      strategy: 'fixed',
    }).then(({ x, y }) => {
      Object.assign(textarea.style, {
        left: `${x}px`,
        top: `${y}px`,
        opacity: '1',
      });
    });
  });
}

/**
 * Positions a combobox listbox below its input and keeps it updated.
 * Returns the `autoUpdate` cleanup function.
 */
export function positionCombobox(
  input: HTMLElement,
  listbox: HTMLElement
): () => void {
  return autoUpdate(input, listbox, () => {
    computePosition(input, listbox, {
      placement: 'bottom-start',
      strategy: 'fixed',
      middleware: [offset(4), flip(), shift({ padding: 8 })],
    }).then(({ x, y }) => {
      Object.assign(listbox.style, {
        left: `${x}px`,
        top: `${y}px`,
        opacity: '1',
      });
    });
  });
}
