/**
 * Mode de déplacement utilisé dans l'interface de gestion des exemplaires.
 *
 * - `toMonography` : remet l'exemplaire en localisation monographie.
 * - `toPresentoir` : envoie l'exemplaire vers le présentoir.
 * @export
 * @type {MoveMode}
 */
export type MoveMode = 'toMonography' | 'toPresentoir';