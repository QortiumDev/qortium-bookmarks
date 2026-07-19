// Reused fr translations from Qortium Home and first-party QDN apps.
import type { EN_STRINGS } from "./en";

const MESSAGES: Partial<Record<keyof typeof EN_STRINGS, string>> = {
  "action.cancel": "Annuler",
  "action.delete": "Supprimer",
  "action.edit": "Modifier",
  "action.open": "Ouvrir",
  "action.refresh": "Actualiser",
  "action.retry": "Réessayer",
  "action.save": "Enregistrer",
  "label.accountUnavailable": "Compte indisponible",
  "label.currentAccount": "Actuel",
  "label.loading": "Chargement",
  "notice.openAccountUnsupported": "Mettez Home à jour pour ouvrir les liens enregistrés avec un compte.",
};

export default MESSAGES;
