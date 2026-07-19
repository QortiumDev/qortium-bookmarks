// Reused nl translations from Qortium Home and first-party QDN apps.
import type { EN_STRINGS } from "./en";

const MESSAGES: Partial<Record<keyof typeof EN_STRINGS, string>> = {
  "action.cancel": "Annuleren",
  "action.delete": "Verwijderen",
  "action.edit": "Bewerken",
  "action.open": "Openen",
  "action.refresh": "Vernieuwen",
  "action.retry": "Opnieuw proberen",
  "action.save": "Opslaan",
  "label.loading": "Bezig met laden",
};

export default MESSAGES;
