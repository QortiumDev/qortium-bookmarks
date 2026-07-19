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
  "label.accountUnavailable": "Kontot är inte tillgängligt",
  "label.currentAccount": "Aktuellt",
  "label.loading": "Läser in",
  "notice.openAccountUnsupported": "Uppdatera Home för att öppna länkar sparade med ett konto.",
};

export default MESSAGES;
