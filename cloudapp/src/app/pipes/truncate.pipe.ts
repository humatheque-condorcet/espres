import { Pipe, PipeTransform } from '@angular/core';
/**
 * Pipe Angular permettant de tronquer une chaîne de caractères
 * à une longueur maximale et d'ajouter une ellipse si nécessaire.
 *
 * @example
 * {{ 'Un texte très long' | truncate:10 }}
 * // → "Un texte…"
 */
@Pipe({
  name: 'truncate'
})
export class TruncatePipe implements PipeTransform {
  /**
   * Tronque une chaîne de caractères à une longueur maximale donnée.
   *
   * Cette méthode fonctionne comme suit :
   *  1. Si la valeur est `null` ou `undefined`, retourne une chaîne vide.
   *  2. Si la longueur de la chaîne dépasse `maxLength`, elle est tronquée et
   *     un caractère "…" est ajouté à la fin.
   *  3. Sinon, retourne la chaîne telle quelle.
   *
   * @param {string | null | undefined} value La chaîne de caractères à tronquer.
   * @param {number} [maxLength=20] La longueur maximale autorisée de la chaîne.
   * @returns {string} La chaîne tronquée avec "…" si nécessaire.
   * @memberof TruncatePipe
   */  
  transform(value: string | null | undefined, maxLength: number = 20): string {
    if (!value) return '';
    return value.length > maxLength ? value.substring(0, maxLength) + '…' : value;
  }
}