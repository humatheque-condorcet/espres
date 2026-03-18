/**
 * Retourne la localisation à partir d'un numéro de cote.
 *
 * @param {string} callNumber Le numéro de cote à analyser.
 * @returns {string} La localisation correspondante.
 */
export function  getLocalisationFromCallNumber(callNumber: string): string {
  let localisation = '-MONOGRAP';

  const callNumberStrip = callNumber.trim();

  if (callNumberStrip.startsWith('CT')) {
    localisation = 'CTLES';
  } else if (callNumberStrip.length > 0) {
    localisation = callNumberStrip[0] + localisation;
  }

  return localisation;
}
