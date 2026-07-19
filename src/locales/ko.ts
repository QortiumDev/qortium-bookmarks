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
  "label.accountUnavailable": "사용할 수 없는 계정",
  "label.currentAccount": "현재",
  "label.loading": "불러오는 중",
  "notice.openAccountUnsupported": "계정이 지정된 링크를 열려면 Home을 업데이트하세요.",
};

export default MESSAGES;
