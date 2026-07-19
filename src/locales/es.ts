// Reused es translations from Qortium Home and first-party QDN apps.
import type { EN_STRINGS } from "./en";

const MESSAGES: Partial<Record<keyof typeof EN_STRINGS, string>> = {
  "action.cancel": "Cancelar",
  "action.delete": "Borrar",
  "action.edit": "Editar",
  "action.open": "Abrir",
  "action.refresh": "Actualizar",
  "action.retry": "Reintentar",
  "action.save": "Guardar",
  "label.accountUnavailable": "Cuenta no disponible",
  "label.currentAccount": "Actual",
  "label.loading": "Cargando",
  "notice.openAccountUnsupported": "Actualiza Home para abrir enlaces guardados con una cuenta.",
};

export default MESSAGES;
