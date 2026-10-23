export type SelectionOverlayPreferences = Readonly<{
  newVisuals: boolean;
  landscape: boolean;
}>;

export type SelectionOverlayStyle = Readonly<{
  compact: boolean;
  sigilScale: number;
  sigilOpacity: number;
}>;

/** Exact legacy sigil parameters; do not route default/off through new material values. */
export const DEFAULT_SELECTION_OVERLAY_STYLE: SelectionOverlayStyle =
  Object.freeze({
    compact: false,
    sigilScale: 1,
    sigilOpacity: 1,
  });

/** Existing sigil, made tile-bounded and quieter only by an explicit display opt-in. */
export const COMPACT_SELECTION_OVERLAY_STYLE: SelectionOverlayStyle =
  Object.freeze({
    compact: true,
    sigilScale: 0.68,
    sigilOpacity: 0.55,
  });

export function selectionOverlayStyle(
  preferences: SelectionOverlayPreferences
): SelectionOverlayStyle {
  return preferences.newVisuals || preferences.landscape
    ? COMPACT_SELECTION_OVERLAY_STYLE
    : DEFAULT_SELECTION_OVERLAY_STYLE;
}
