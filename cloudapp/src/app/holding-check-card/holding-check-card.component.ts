import { Component, Input } from '@angular/core';
import { Resource } from '../models/resource';


@Component({
  selector: 'app-holding-check-card',          
  templateUrl: './holding-check-card.component.html',
  styleUrls: ['./holding-check-card.component.scss']
})
export class HoldingCheckCardComponent {
  /**
   * La ressource à afficher pour cette carte de vérification.
   * Ce champ est obligatoire.
   * 
   * @type {Resource}
   */  
  @Input() resource!: Resource;  
}
