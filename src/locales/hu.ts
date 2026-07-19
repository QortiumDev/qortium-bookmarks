// Reused hu translations from Qortium Home and first-party QDN apps.
import type { EN_STRINGS } from "./en";

const MESSAGES: Partial<Record<keyof typeof EN_STRINGS, string>> = {
  "action.cancel": "Mégse",
  "action.delete": "Törlés",
  "action.edit": "Szerkesztés",
  "action.open": "Megnyitás",
  "action.refresh": "Frissítés",
  "action.retry": "Újra",
  "action.save": "Mentés",
  "label.accountUnavailable": "Fiók nem érhető el",
  "label.currentAccount": "Jelenlegi",
  "label.loading": "Betöltés",
  "notice.openAccountUnsupported": "Frissítsd a Home-ot a fiókhoz mentett hivatkozások megnyitásához.",
};

export default MESSAGES;
