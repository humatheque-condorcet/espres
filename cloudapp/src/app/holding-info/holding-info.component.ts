import { Component, Input } from '@angular/core';
import { Holding } from '../models/holding';


@Component({
  selector: 'app-holding-info',          
  templateUrl: './holding-info.component.html',
  styleUrls: ['./holding-info.component.scss']
})
export class HoldingInfoComponent {
  /**
   * La holding dont on souhaite afficher les informations.
   * Ce champ est obligatoire.
   * 
   * @type {Holding}
   */  
  @Input() holding!: Holding;  
}
