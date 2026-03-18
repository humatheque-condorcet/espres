import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

/**
 * Composant de dialogue de confirmation.
 *
 * Ce composant affiche un message de confirmation à l'utilisateur avec deux boutons :
 * - **Annuler** : ferme le dialogue sans action.
 * - **Oui / Confirmer** : ferme le dialogue et renvoie `true`.
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
  /**
   * Constructeur du composant.
   *
   * Injecte la référence du dialogue Angular Material pour pouvoir le fermer et renvoyer
   * une valeur à l'appelant.
   *
   * @param {MatDialogRef<ConfirmDialogComponent>} dialogRef Référence du dialogue Angular Material.
   * @memberof ConfirmDialogComponent
   */  
  constructor(private dialogRef: MatDialogRef<ConfirmDialogComponent>) {}

  /**
   * Méthode appelée lorsque l'utilisateur confirme l'action.
   *
   * Cette méthode ferme le dialogue et renvoie `true` à l'appelant.
   *
   * @memberof ConfirmDialogComponent
   */
  confirm() {
    this.dialogRef.close(true);
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