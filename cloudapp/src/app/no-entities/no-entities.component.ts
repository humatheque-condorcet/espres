import { Component } from '@angular/core';
/**
 * Composant d'affichage utilisé lorsqu'aucune entité n'est disponible.
 *
 * Ce composant est typiquement utilisé comme état vide ("empty state")
 * dans les vues listant des éléments (tableaux, listes, résultats de recherche).
 *
 * Il ne contient aucune logique métier et se contente de présenter
 * un message informatif à l'utilisateur.
 *
 * @selector app-no-entities
 */
@Component({
  selector: 'app-no-entities',          
  templateUrl: './no-entities.component.html',
  styleUrls: ['./no-entities.component.scss']
})
export class NoEntitiesComponent {
}
