/**
 * Haptic feedback utility using web-haptics (iOS Taptic Engine workaround).
 * Use on trade confirmations, wallet actions, buttons, and key interactions.
 */

import { WebHaptics } from "web-haptics";

// Lazy singleton — created on first use (client-only)
let instance: WebHaptics | null = null;
function getHaptics(): WebHaptics {
    if (!instance) instance = new WebHaptics();
    return instance;
}

export const haptics = {
    /** Light tap — button presses, toggles */
    light: () => getHaptics().trigger("light"),
    /** Medium tap — selection changes, confirmations */
    medium: () => getHaptics().trigger("medium"),
    /** Heavy tap — transaction sent, trade executed */
    heavy: () => getHaptics().trigger("heavy"),
    /** Success — completed actions */
    success: () => getHaptics().trigger("success"),
    /** Warning — alerts, destructive previews */
    warning: () => getHaptics().trigger("warning"),
    /** Error — failed actions */
    error: () => getHaptics().trigger("error"),
};
