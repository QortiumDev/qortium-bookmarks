// Reused et translations from Qortium Home and first-party QDN apps.
import type { EN_STRINGS } from "./en";

const MESSAGES: Partial<Record<keyof typeof EN_STRINGS, string>> = {
  "action.cancel": "Tühista",
  "action.delete": "Kustuta",
  "action.edit": "Muuda",
  "action.open": "Ava",
  "action.refresh": "Värskenda",
  "action.retry": "Proovi uuesti",
  "action.save": "Salvesta",
  "label.accountUnavailable": "Konto pole saadaval",
  "label.currentAccount": "Praegune",
  "label.loading": "Laadimine",
  "notice.openAccountUnsupported": "Värskenda Home'i, et avada kontoga salvestatud lingid.",
};

export default MESSAGES;
