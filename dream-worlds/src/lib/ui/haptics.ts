/** Light haptic tick for selections (Android/PWA). A native wrapper would map this to UIImpactFeedbackGenerator. */
export function haptic(kind: "light" | "medium" | "success" = "light") {
  try {
    navigator.vibrate?.(kind === "light" ? 8 : kind === "medium" ? 16 : [10, 40, 18]);
  } catch {}
}
