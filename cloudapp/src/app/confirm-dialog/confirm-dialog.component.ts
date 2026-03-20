import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ConfirmDialogData } from '../models/confirm-dialog-data';

/**
 * Composant de dialogue de confirmation.
 *
 * Ce composant affiche un message de confirmation à l'utilisateur avec deux boutons :
 * - **Annuler** : ferme le dialogue sans action.
 * - **Oui / Confirmer** : ferme le dialogue et renvoie `true`.
 * 
 * Il gère aussi le choix d'une destination de présentoir, le cas échéant.
 *
 * Il est destiné à être utilisé avec Angular Material `MatDialog` et peut être réutilisé
 * pour tout type de confirmation dans l'application.
 *
 * @export
 * @class ConfirmDialogComponent
 */
@Component({
  selector: 'app-confirm-dialog',
  templateUrl: './confirm-dialog.component.html',
})
export class ConfirmDialogComponent {
  /** Localisation sélectionnée par l'utilisateur pour le déplacement vers un présentoir. */
  selectedLocation: string = "";

  /**
   * Constructeur du composant.
   *
   * Injecte la référence du dialogue Angular Material pour pouvoir le fermer et renvoyer
   * une valeur à l'appelant.
   *
   * @param {MatDialogRef<ConfirmDialogComponent>} dialogRef Référence du dialogue Angular Material.
   * @memberof ConfirmDialogComponent
   */  
  constructor(
      private dialogRef: MatDialogRef<ConfirmDialogComponent>,
      @Inject(MAT_DIALOG_DATA) public data: ConfirmDialogData
  ) {}

  /**
   * Détermine si le bouton de confirmation doit être désactivé.
   *
   * En mode "présentoir", le bouton est désactivé si aucune localisation n'est sélectionnée.
   * En mode "monographie", le bouton est toujours activé.
   *
   * @returns {boolean} `true` si le bouton doit être désactivé, sinon `false`.
   */
  disableButton(): boolean {
    console.log(this.data.isPresentoirMode);
    return this.data.isPresentoirMode ? !this.selectedLocation : false;
  }

  /**
   * Méthode appelée lorsque l'utilisateur confirme l'action.
   *
   * Si le mode est "présentoir" (`isPresentoirMode`), vérifie qu'une localisation a été sélectionnée.
   * Si aucune localisation n'est sélectionnée, la méthode ne fait rien.
   * Sinon, ferme le dialogue et renvoie :
   * - La localisation sélectionnée si le mode est "présentoir".
   * - `true` si le mode est "monographie".
   *
   * @memberof ConfirmDialogComponent
   */
  confirm() {
    if (this.data.isPresentoirMode && !this.selectedLocation) {
      // Ne pas fermer le dialogue si la sélection obligatoire est non remplie
      return;
    }

    this.dialogRef.close(this.data.isPresentoirMode ? this.selectedLocation : true);
  }

  /**
   * Méthode appelée lorsque l'utilisateur annule l'action.
   *
   * Cette méthode ferme le dialogue et renvoie `false` à l'appelant.
   *
   * @memberof ConfirmDialogComponent
   */
  cancel() {
    this.dialogRef.close(false);
  }
}