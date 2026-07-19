// Reused sv translations from Qortium Home and first-party QDN apps.
import type { EN_STRINGS } from "./en";

const MESSAGES: Partial<Record<keyof typeof EN_STRINGS, string>> = {
  "action.cancel": "Avbryt",
  "action.delete": "Ta bort",
  "action.edit": "Redigera",
  "action.open": "Öppna",
  "action.refresh": "Uppdatera",
  "action.retry": "Försök igen",
  "action.save": "Spara",
  "label.loading": "Läser in",
};

export default MESSAGES;
