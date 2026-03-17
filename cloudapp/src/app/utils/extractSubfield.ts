/**
 * Extrait la valeur d'un sous-champ donné du XML contenu dans une holding (champ 852),
 * nettoie les espaces et retourne la chaîne brute.
 * Lève une erreur si le subfield est absent ou si le XML est manquant.
 *
 * @param {any} data Objet holding contenant le tableau `anies` avec le XML.
 * @param {string} code Code du subfield à extraire (ex : "h" ou "c").
 * @returns {string} La valeur du subfield nettoyée.
 * @throws {Error} Si le XML est absent ou le subfield n'existe pas.
 */
export function extractSubfield(data: any, code: string): string {
  const xml = data.anies?.[0];

  if (!xml) {
    console.error(`extractSubfield: aucun XML trouvé dans data.anies`);
    throw new Error(`Impossible d'extraire le subfield ${code} (XML absent)`);
  }

  const doc = new DOMParser().parseFromString(xml, "application/xml");
  const node = doc.querySelector(`subfield[code="${code}"]`);

  if (!node?.textContent) {
    console.error(`extractSubfield: subfield ${code} absent dans le XML suivant : ${xml}`);
    throw new Error(`Impossible d'extraire le subfield ${code} dans le XML suivant : ${xml} (élément manquant)`);
  }

  return node.textContent
    .replace(/\u00A0/g, " ")  // remplace les espaces insécables
    .replace(/\s+/g, " ")     // réduit les espaces multiples
    .trim();
}

/**
 * Extrait la valeur du sous-champ 852$h d'une holding.
 * Retourne une chaîne vide si le subfield est absent ou si une erreur survient.
 *
 * @param {any} data Objet holding contenant le XML.
 * @returns {string} La valeur du subfield h nettoyée ou chaîne vide.
 */
export function extractRawSubfieldH(data: any): string {
  try {
    return extractSubfield(data, "h");
  } catch (e) {
    console.error(e);
    return "";
  }
}

/**
 * Extrait la valeur du sous-champ 852$c d'une holding.
 * Retourne une chaîne vide si le subfield est absent ou si une erreur survient.
 *
 * @param {any} data Objet holding contenant le XML.
 * @returns {string} La valeur du subfield c nettoyée ou chaîne vide.
 */
export function extractRawSubfieldC(data: any): string {
  try {
    return extractSubfield(data, "c");
  } catch (e) {
    console.error(e);
    return "";
  }
}