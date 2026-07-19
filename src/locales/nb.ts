// Reused nb translations from Qortium Home and first-party QDN apps.
import type { EN_STRINGS } from "./en";

const MESSAGES: Partial<Record<keyof typeof EN_STRINGS, string>> = {
  "action.cancel": "Avbryt",
  "action.delete": "Slett",
  "action.edit": "Rediger",
  "action.open": "Åpne",
  "action.refresh": "Oppdater",
  "action.retry": "Prøv igjen",
  "action.save": "Lagre",
  "label.accountUnavailable": "Konto ikke tilgjengelig",
  "label.currentAccount": "Gjeldende",
  "label.loading": "Laster inn",
  "notice.openAccountUnsupported": "Oppdater Home for å åpne lenker lagret med en konto.",
};

export default MESSAGES;
