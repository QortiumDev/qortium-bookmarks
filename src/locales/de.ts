// Reused de translations from Qortium Home and first-party QDN apps.
import type { EN_STRINGS } from "./en";

const MESSAGES: Partial<Record<keyof typeof EN_STRINGS, string>> = {
  "action.cancel": "Abbrechen",
  "action.delete": "Löschen",
  "action.edit": "Bearbeiten",
  "action.open": "Öffnen",
  "action.refresh": "Aktualisieren",
  "action.retry": "Erneut versuchen",
  "action.save": "Speichern",
  "label.accountUnavailable": "Konto nicht verfügbar",
  "label.currentAccount": "Aktuell",
  "label.loading": "Wird geladen",
  "notice.openAccountUnsupported": "Aktualisiere Home, um Links mit einem gespeicherten Konto zu öffnen.",
};

export default MESSAGES;
