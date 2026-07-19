// Reused pl translations from Qortium Home and first-party QDN apps.
import type { EN_STRINGS } from "./en";

const MESSAGES: Partial<Record<keyof typeof EN_STRINGS, string>> = {
  "action.cancel": "Anuluj",
  "action.delete": "Usuń",
  "action.edit": "Edytuj",
  "action.open": "Otwórz",
  "action.refresh": "Odśwież",
  "action.retry": "Ponów",
  "action.save": "Zapisz",
  "label.loading": "Wczytywanie",
};

export default MESSAGES;
