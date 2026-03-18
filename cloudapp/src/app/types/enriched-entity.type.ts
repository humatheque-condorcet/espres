import { Entity } from "@exlibris/exl-cloudapp-angular-lib";
import { EntityExtended } from "../models/entity-extended";

/**
 * Représente une entité pouvant être soit simple, soit enrichie avec des détails.
 *
 * Ce type union permet de manipuler de manière uniforme :
 *  1. Les entités de base (`Entity`) telles que fournies par le contexte Ex Libris.
 *  2. Les entités enrichies (`EntityExtended`) contenant des informations supplémentaires (`details`).
 *
 * Il est utilisé dans les flux de données où les entités peuvent être progressivement
 * enrichies après récupération de données complémentaires via des appels API.
 *
 * L'utilisation de ce type nécessite souvent un *type guard* (comme `isExtended`)
 * afin de déterminer si la propriété `details` est disponible.
 *
 * @export
 * @type {EnrichedEntity}
 */
export type EnrichedEntity = Entity | EntityExtended;
