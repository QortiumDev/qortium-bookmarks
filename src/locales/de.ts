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
  "label.loading": "Wird geladen",
};

export default MESSAGES;
