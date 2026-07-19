// Reused pt translations from Qortium Home and first-party QDN apps.
import type { EN_STRINGS } from "./en";

const MESSAGES: Partial<Record<keyof typeof EN_STRINGS, string>> = {
  "action.cancel": "Cancelar",
  "action.delete": "Excluir",
  "action.edit": "Editar",
  "action.open": "Abrir",
  "action.refresh": "Atualizar",
  "action.retry": "Tentar novamente",
  "action.save": "Salvar",
  "label.accountUnavailable": "Conta indisponível",
  "label.currentAccount": "Atual",
  "label.loading": "Carregando",
  "notice.openAccountUnsupported": "Atualize o Home para abrir links salvos com uma conta.",
};

export default MESSAGES;
