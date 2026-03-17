import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Holding } from '../models/holding';
import { MatRadioChange } from '@angular/material/radio';
import { Resource } from '../models/resource';


@Component({
  selector: 'app-holding-results-card',          
  templateUrl: './holding-results-card.component.html',
  styleUrls: ['./holding-results-card.component.scss']
})
export class HoldingResultsCardComponent {

  /**
   * Résultats de la vérification des holdings.
   * Chaque élément contient :
   *  - `holding` : la holding vérifiée
   *  - `result` : l'objet Resource retourné par Plac si valide, sinon `null`
   *  - `error`  : `null` si pas d'erreur, ou l'objet d'erreur si la vérification a échoué
   * 
   * Peut être `null` si aucun résultat n'est disponible.
   * 
   * @type {{ holding: Holding; result: Resource | null; error: any | null }[] | null}
   */
  @Input() results: { holding: Holding; result: Resource | null; error: any | null }[] | null = null;
}
