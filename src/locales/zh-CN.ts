// Reused zh-CN translations from Qortium Home and first-party QDN apps.
import type { EN_STRINGS } from "./en";

const MESSAGES: Partial<Record<keyof typeof EN_STRINGS, string>> = {
  "action.cancel": "取消",
  "action.delete": "删除",
  "action.edit": "编辑",
  "action.open": "打开",
  "action.refresh": "刷新",
  "action.retry": "重试",
  "action.save": "保存",
  "label.accountUnavailable": "账户不可用",
  "label.currentAccount": "当前",
  "label.loading": "加载中",
  "notice.openAccountUnsupported": "更新 Home 以打开保存了账户的链接。",
};

export default MESSAGES;
