/** Joins class names, skipping falsy values. */
export function classNames(...names: Array<string | false | null | undefined | 0>): string {
  return names.filter(Boolean).join(" ");
}

export default classNames;
