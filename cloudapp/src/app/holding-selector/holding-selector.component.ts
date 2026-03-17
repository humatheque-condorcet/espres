import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Holding } from '../models/holding';
import { MatRadioChange } from '@angular/material/radio';


@Component({
  selector: 'app-holding-selector',          
  templateUrl: './holding-selector.component.html',
  styleUrls: ['./holding-selector.component.scss']
})
export class HoldingSelectorComponent {
  /**
   * Liste des holdings à afficher pour sélection.
   * @type {Holding[]}
   */
  @Input() holdings: Holding[] = [];

  /**
   * Événement émis lorsqu'une holding est sélectionnée.
   * L'objet émis est la holding choisie.
   * @type {EventEmitter<Holding>}
   */
  @Output() selected = new EventEmitter<Holding>();

  /**
   * Gère la sélection d'une holding via un bouton radio.
   * Émet la holding sélectionnée à travers l'EventEmitter `selected`.
   *
   * @param {MatRadioChange} event L'événement de changement du radio bouton.
   * @returns {void}
   */
  select(event: MatRadioChange) { this.selected.emit(event.value as Holding); }
}
