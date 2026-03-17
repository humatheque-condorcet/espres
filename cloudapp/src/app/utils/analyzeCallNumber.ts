import { ExtractResult } from "../models/extract-result";

/**
 * Analyse une cote déjà nettoyée pour en extraire un code de lot ou de corpus.
 *
 * Cette fonction fonctionne comme suit :
 *  1. Vérifie si la cote correspond au format d'un lot (`pattern1`) ou d'un corpus (`pattern2`).
 *  2. Si c'est un lot, retourne un objet `ExtractResult` avec :
 *      - `fullValue` : la cote complète
 *      - `mainPart` : la partie correspondant au code de lot
 *      - `typeValue` : `"lot"`
 *  3. Si c'est un corpus, retourne un objet `ExtractResult` avec :
 *      - `fullValue` : la cote complète
 *      - `mainPart` : la cote sans la partie finale (identifiant spécifique)
 *      - `typeValue` : `"corpus"`
 *  4. Si la cote ne correspond à aucun format attendu, lève une erreur.
 *
 * @param {string} cleaned La cote déjà nettoyée à analyser.
 * @returns {ExtractResult} Les informations extraites de la cote.
 * @throws {Error} Si la cote n'est pas dans un format autorisé.
 */
export function  analyzeCallNumber(cleaned: string): ExtractResult {
  const pattern1 = /^([A-H][0-9][A-Za-z0-9] [0-9]{3}) [A-Z0-9]{3,5}$/; // lots
  const pattern2 = /^(C\s[123][A-Z0-9_\-]{0,7}[a-z]?|D\s[A-Z0-9_\-]{0,6}[a-z]?)\s[A-Z0-9]{1,5}$/; // corpus

  const match1 = cleaned.match(pattern1);
  const match2 = cleaned.match(pattern2);

  if (match1) {
    return {
      fullValue: cleaned,
      mainPart: match1[1],
      typeValue: "lot"
    };
  }

  if (match2) {
    return {
      fullValue: cleaned,
      mainPart: cleaned.replace(/\s[A-Z0-9]{1,5}$/, ''),
      typeValue: "corpus"
    };
  }

  // Si aucun match n'a eu lieu, c'est une erreur de forme !
  throw new Error(`La valeur '${cleaned}' n'est pas une forme de cote autorisée.`);
}
