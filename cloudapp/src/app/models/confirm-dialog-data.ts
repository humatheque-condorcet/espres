/**
 * Interface représentant les données passées au dialogue de confirmation.
 *
 * @interface ConfirmDialogData
 * @property {boolean} isPresentoirMode - Indique si le mode "présentoir" est activé.
 * @property {string[]} presentoirLocations - Liste des localisations de présentoir disponibles.
 */
export interface ConfirmDialogData {
  isPresentoirMode: boolean;
  presentoirLocations: string[];
}