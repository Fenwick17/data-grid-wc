/**
 * Data Grid types, column configuration, default data, and small model helpers.
 *
 * Kept separate from the component so consumers can import the `Person` and
 * `JobStatus` types without pulling in the element implementation.
 */

export type JobStatus = 'Employed' | 'Unemployed' | 'Self-employed';

export interface Person {
  firstName: string;
  lastName: string;
  jobStatus: JobStatus;
  hairColour: string;
}

export const JOB_STATUSES: ReadonlyArray<JobStatus> = [
  'Employed',
  'Unemployed',
  'Self-employed',
];

export type DataColumn = {
  type: 'data';
  key: keyof Person;
  label: string;
  editable: boolean;
  editor?: 'input' | 'textarea' | 'combobox';
};

export type Column =
  | { type: 'handle'; label: string }
  | { type: 'select'; label: string }
  | { type: 'actions'; label: string }
  | DataColumn;

export type RowAction =
  | 'delete'
  | 'duplicate'
  | 'addBelow'
  | 'moveUp'
  | 'moveDown';

export const COLUMNS: ReadonlyArray<Column> = [
  { type: 'handle', label: '' },
  { type: 'select', label: 'Select' },
  { type: 'data', key: 'firstName', label: 'First name', editable: true },
  { type: 'data', key: 'lastName', label: 'Last name', editable: false },
  {
    type: 'data',
    key: 'jobStatus',
    label: 'Job status',
    editable: true,
    editor: 'combobox',
  },
  {
    type: 'data',
    key: 'hairColour',
    label: 'Hair colour',
    editable: true,
    editor: 'textarea',
  },
  { type: 'actions', label: 'Actions' },
];

export const DUMMY_ROWS: Person[] = [
  {
    firstName: 'Ada',
    lastName: 'Lovelace',
    jobStatus: 'Employed',
    hairColour: 'Brown',
  },
  {
    firstName: 'Alan',
    lastName: 'Turing',
    jobStatus: 'Self-employed',
    hairColour: 'Black',
  },
  {
    firstName: 'Grace',
    lastName: 'Hopper',
    jobStatus: 'Unemployed',
    hairColour: 'White',
  },
];

/** A blank row used by the "Add row below" action. */
export function blankRow(): Person {
  return {
    firstName: '',
    lastName: '',
    jobStatus: 'Employed',
    hairColour: '',
  };
}

/** Finds the job status that exactly matches the given text, if any. */
export function findExactJobStatus(value: string): JobStatus | undefined {
  const needle = value.trim().toLowerCase();
  return JOB_STATUSES.find((option) => option.toLowerCase() === needle);
}

/** Filters the job-status options by a case-insensitive substring. */
export function filterJobStatuses(query: string): JobStatus[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [...JOB_STATUSES];
  return JOB_STATUSES.filter((option) =>
    option.toLowerCase().includes(needle)
  );
}
