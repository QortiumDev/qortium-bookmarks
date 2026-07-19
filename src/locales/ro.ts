// Reused ro translations from Qortium Home and first-party QDN apps.
import type { EN_STRINGS } from "./en";

const MESSAGES: Partial<Record<keyof typeof EN_STRINGS, string>> = {
  "action.cancel": "Anulează",
  "action.delete": "Șterge",
  "action.edit": "Editează",
  "action.open": "Deschide",
  "action.refresh": "Reîmprospătează",
  "action.retry": "Reîncearcă",
  "action.save": "Salvează",
  "label.loading": "Se încarcă",
};

export default MESSAGES;
