// Reused ko translations from Qortium Home and first-party QDN apps.
import type { EN_STRINGS } from "./en";

const MESSAGES: Partial<Record<keyof typeof EN_STRINGS, string>> = {
  "action.cancel": "취소",
  "action.delete": "삭제",
  "action.edit": "편집",
  "action.open": "열기",
  "action.refresh": "새로고침",
  "action.retry": "다시 시도",
  "action.save": "저장",
  "label.loading": "불러오는 중",
};

export default MESSAGES;
