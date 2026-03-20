/**
 * Interface représentant une notice bibliographique (Bib) dans Alma.
 *
 * @interface Bib
 * @property {string} link - Lien vers la ressource dans Alma.
 * @property {string} mms_id - Identifiant unique de la notice bibliographique (MMS ID).
 * @property {string} title - Titre de la notice bibliographique.
 * @property {string} author - Auteur de la notice bibliographique.
 * @property {string} record_format - Format de la notice bibliographique.
 * @property {any} anies - Données supplémentaires associées à la notice (non typées).
 */
export interface Bib {
  link: string,
  mms_id: string;
  title: string;
  author: string;
  record_format: string;
  anies: any;
}