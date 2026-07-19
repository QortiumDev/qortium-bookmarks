// Reused it translations from Qortium Home and first-party QDN apps.
import type { EN_STRINGS } from "./en";

const MESSAGES: Partial<Record<keyof typeof EN_STRINGS, string>> = {
  "action.cancel": "Annulla",
  "action.delete": "Elimina",
  "action.edit": "Modifica",
  "action.open": "Apri",
  "action.refresh": "Aggiorna",
  "action.retry": "Riprova",
  "action.save": "Salva",
  "label.loading": "Caricamento in corso",
};

export default MESSAGES;
