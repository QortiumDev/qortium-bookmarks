// Reused hi translations from Qortium Home and first-party QDN apps.
import type { EN_STRINGS } from "./en";

const MESSAGES: Partial<Record<keyof typeof EN_STRINGS, string>> = {
  "action.cancel": "रद्द करें",
  "action.delete": "हटाएं",
  "action.edit": "संपादित करें",
  "action.open": "खोलें",
  "action.refresh": "रीफ्रेश करें",
  "action.retry": "फिर कोशिश करें",
  "action.save": "सहेजें",
  "label.accountUnavailable": "खाता अनुपलब्ध",
  "label.currentAccount": "मौजूदा",
  "label.loading": "लोड हो रहा है",
  "notice.openAccountUnsupported": "किसी खाते के साथ सहेजे गए लिंक खोलने के लिए Home अपडेट करें।",
};

export default MESSAGES;
