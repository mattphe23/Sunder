/**
 * Wakecutter is a development-only rules experiment. A query must opt into all
 * three pieces explicitly; production callers pass `false` for `dev`.
 */
export function navalMvpPreviewEnabled(search: string, dev: boolean): boolean {
  if (!dev) return false;
  const query = new URLSearchParams(search);
  return query.has("devgame") && query.get("naval-mvp") === "1";
}
