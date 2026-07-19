// Reused he translations from Qortium Home and first-party QDN apps.
import type { EN_STRINGS } from "./en";

const MESSAGES: Partial<Record<keyof typeof EN_STRINGS, string>> = {
  "action.cancel": "ביטול",
  "action.delete": "מחיקה",
  "action.edit": "עריכה",
  "action.open": "פתיחה",
  "action.refresh": "רענון",
  "action.retry": "ניסיון חוזר",
  "action.save": "שמירה",
  "label.accountUnavailable": "חשבון לא זמין",
  "label.currentAccount": "נוכחי",
  "label.loading": "טוען",
  "notice.openAccountUnsupported": "עדכנו את Home כדי לפתוח קישורים שנשמרו עם חשבון.",
};

export default MESSAGES;
