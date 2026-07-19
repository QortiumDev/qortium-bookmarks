// Reused ar translations from Qortium Home and first-party QDN apps.
import type { EN_STRINGS } from "./en";

const MESSAGES: Partial<Record<keyof typeof EN_STRINGS, string>> = {
  "action.cancel": "إلغاء",
  "action.delete": "حذف",
  "action.edit": "تحرير",
  "action.open": "فتح",
  "action.refresh": "تحديث",
  "action.retry": "إعادة المحاولة",
  "action.save": "حفظ",
  "label.accountUnavailable": "حساب غير متاح",
  "label.currentAccount": "الحالي",
  "label.loading": "جارٍ التحميل",
  "notice.openAccountUnsupported": "حدِّث Home لفتح روابط محفوظة بحساب معيّن.",
};

export default MESSAGES;
