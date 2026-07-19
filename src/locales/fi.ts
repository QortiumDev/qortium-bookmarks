// Reused fi translations from Qortium Home and first-party QDN apps.
import type { EN_STRINGS } from "./en";

const MESSAGES: Partial<Record<keyof typeof EN_STRINGS, string>> = {
  "action.cancel": "Peruuta",
  "action.delete": "Poista",
  "action.edit": "Muokkaa",
  "action.open": "Avaa",
  "action.refresh": "Päivitä näkymä",
  "action.retry": "Yritä uudelleen",
  "action.save": "Tallenna",
  "label.accountUnavailable": "Tili ei käytettävissä",
  "label.currentAccount": "Nykyinen",
  "label.loading": "Ladataan",
  "notice.openAccountUnsupported": "Päivitä Home avataksesi tilillä tallennettuja linkkejä.",
};

export default MESSAGES;
