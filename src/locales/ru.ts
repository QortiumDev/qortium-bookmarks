// Reused ru translations from Qortium Home and first-party QDN apps.
import type { EN_STRINGS } from "./en";

const MESSAGES: Partial<Record<keyof typeof EN_STRINGS, string>> = {
  "action.cancel": "Отмена",
  "action.delete": "Удалить",
  "action.edit": "Редактировать",
  "action.open": "Открыть",
  "action.refresh": "Обновить",
  "action.retry": "Повторить",
  "action.save": "Сохранить",
  "label.loading": "Загрузка",
};

export default MESSAGES;
