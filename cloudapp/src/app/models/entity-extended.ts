import { Entity } from "@exlibris/exl-cloudapp-angular-lib";
import { Item } from "./item";

/**
 * Représente une entité enrichie avec des détails supplémentaires.
 *
 * Cette interface étend l'entité de base (`Entity`) fournie par la librairie
 * Ex Libris en y ajoutant une propriété `details` contenant les informations
 * complètes d’un item.
 *
 * Elle est utilisée après récupération des données via le service `ItemsService`
 * afin de disposer d’une structure unifiée combinant :
 *  1. Les métadonnées de base de l’entité (id, type, lien, etc.).
 *  2. Les détails complets de l’item associés à cette entité.
 *
 * @export
 * @interface EntityExtended
 * @extends {Entity}
 */
export interface EntityExtended extends Entity {
  details: Item;
}
