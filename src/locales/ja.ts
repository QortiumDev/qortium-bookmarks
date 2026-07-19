// Reused ja translations from Qortium Home and first-party QDN apps.
import type { EN_STRINGS } from "./en";

const MESSAGES: Partial<Record<keyof typeof EN_STRINGS, string>> = {
  "action.cancel": "キャンセル",
  "action.delete": "削除",
  "action.edit": "編集",
  "action.open": "開く",
  "action.refresh": "更新",
  "action.retry": "再試行",
  "action.save": "保存",
  "label.loading": "読み込み中",
};

export default MESSAGES;
