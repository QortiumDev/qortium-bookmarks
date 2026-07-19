// Reused zh-TW translations from Qortium Home and first-party QDN apps.
import type { EN_STRINGS } from "./en";

const MESSAGES: Partial<Record<keyof typeof EN_STRINGS, string>> = {
  "action.cancel": "取消",
  "action.delete": "刪除",
  "action.edit": "編輯",
  "action.open": "開啟",
  "action.refresh": "重新整理",
  "action.retry": "重試",
  "action.save": "儲存",
  "label.accountUnavailable": "帳戶無法使用",
  "label.currentAccount": "目前",
  "label.loading": "載入中",
  "notice.openAccountUnsupported": "更新 Home 以開啟已儲存帳戶的連結。",
};

export default MESSAGES;
