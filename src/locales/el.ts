// Reused el translations from Qortium Home and first-party QDN apps.
import type { EN_STRINGS } from "./en";

const MESSAGES: Partial<Record<keyof typeof EN_STRINGS, string>> = {
  "action.cancel": "Ακύρωση",
  "action.delete": "Διαγραφή",
  "action.edit": "Επεξεργασία",
  "action.open": "Άνοιγμα",
  "action.refresh": "Ανανέωση",
  "action.retry": "Επανάληψη",
  "action.save": "Αποθήκευση",
  "label.accountUnavailable": "Μη διαθέσιμος λογαριασμός",
  "label.currentAccount": "Τρέχων",
  "label.loading": "Φόρτωση",
  "notice.openAccountUnsupported": "Ενημερώστε το Home για να ανοίγετε συνδέσμους με αποθηκευμένο λογαριασμό.",
};

export default MESSAGES;
