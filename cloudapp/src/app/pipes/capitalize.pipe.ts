import { Pipe, PipeTransform } from '@angular/core';
/**
 * Pipe Angular permettant de mettre en majuscule la première lettre 
 * d'une chaîne et en minuscule le reste.
 *
 * @example
 * {{ 'CE TEXTE' | capitalize }}
 * // → "Ce texte"
 */
@Pipe({name: 'capitalize'})
export class CapitalizePipe implements PipeTransform {
  /**
   * Met en majuscule la première lettre d'une chaîne et en minuscule le reste.
   *
   * Cette méthode fonctionne comme suit :
   *  1. Si la valeur est vide ou nulle, retourne une chaîne vide.
   *  2. Met en majuscule le premier caractère de la chaîne.
   *  3. Met en minuscules tous les caractères suivants.
   *
   * @param {string} value La chaîne de caractères à transformer.
   * @returns {string} La chaîne transformée avec une majuscule initiale et le reste en minuscules.
   * @memberof CapitalizePipe
   */  
  transform(value: string): string {
    if (!value) return '';
    return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
  }
}