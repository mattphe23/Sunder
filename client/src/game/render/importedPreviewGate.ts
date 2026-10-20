/** Legacy imported-unit studies are never a production visual preset. */
export type ImportedUnitPreviewFlag =
  | "p2-warrior"
  | "p2-archer"
  | "p2-defender"
  | "p2-rider"
  | "p2-rider-v2"
  | "p2-tidecaller"
  | "p2-nereth"
  | "p2-auren-warrior";

export function importedUnitPreviewEnabled(search: string, dev: boolean, flag: ImportedUnitPreviewFlag): boolean {
  if (!dev) return false;
  const query = new URLSearchParams(search);
  return query.has("devgame") && query.get(flag) === "1";
}
