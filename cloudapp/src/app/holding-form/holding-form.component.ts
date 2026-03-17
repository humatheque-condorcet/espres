import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormGroup, FormControl, Validators, AbstractControl, FormBuilder } from '@angular/forms';
import { Holding } from '../models/holding';
import { analyzeCallNumber } from '../utils/analyzeCallNumber';
import { PlacService } from '../services/plac.service';
import { catchError, map, of } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-holding-form',
  templateUrl: './holding-form.component.html',
  styleUrls: ['./holding-form.component.scss']
})
export class HoldingFormComponent {
 
  /**
 * Holding à modifier dans le formulaire.
 * Ce champ est obligatoire.
 *
 * @type {Holding}
 * @memberof HoldingFormComponent
 */
  @Input({ required: true }) holding!: Holding; // holding à modifier

  /**
   * Liste des localisations possibles à afficher dans la liste déroulante.
   * Chaque élément possède un code et un nom.
   *
   * @type {{ code: string; name: string }[]}
   * @memberof HoldingFormComponent
   */  
  @Input() locations: { code: string; name: string }[] = []; // pour la liste déroulante

  /**
   * Indique si la liste des localisations est en cours de chargement.
   *
   * @type {boolean}
   * @memberof HoldingFormComponent
   */
  @Input() loadingLocations: boolean = true 

  /**
   * Événement émis lorsque l'utilisateur annule la modification et ferme le formulaire.
   *
   * @type {EventEmitter<void>}
   * @memberof HoldingFormComponent
   */
  @Output() formClosed = new EventEmitter<void>();

  /**
   * Événement émis lorsque la holding est sauvegardée via le formulaire.
   * Contient les nouvelles valeurs du formulaire.
   *
   * @type {EventEmitter<any>}
   * @memberof HoldingFormComponent
   */
  @Output() holdingSaved = new EventEmitter<any>();

  form!: FormGroup;

  constructor(private placService: PlacService, 
    private fb: FormBuilder) {}

  /**
   * Initialisation du composant de formulaire de modification d'une holding.
   *
   * Cette méthode effectue les opérations suivantes :
   *  1. Construit le formulaire réactif (`FormGroup`) avec deux contrôles :
   *     - `location` : prérempli avec la localisation de la holding, obligatoire.
   *     - `call_number_value` : prérempli avec la cote de la holding, avec deux validateurs :
   *         - `callNumberValidator` : contrôle synchronisé du format et de la cohérence avec la localisation.
   *         - `callNumberPlacValidator` : contrôle asynchrone de validité dans Plac.
   *  2. Met en place un écouteur sur `location.valueChanges` pour forcer la re-validation de `call_number_value`
   *     chaque fois que la localisation change, afin de garantir la cohérence entre les deux champs.
   *
   * @memberof HoldingFormComponent
   * @returns {void}
   */
  ngOnInit() {
    // Construction du formulaire
    this.form = this.fb.group({
      location: [this.holding.location || '', Validators.required],
      call_number_value: [this.holding.call_number_value || '', 
        [ Validators.required, this.callNumberValidator ],
        [ this.callNumberPlacValidator.bind(this) ]
      ]
    });

    // On force le contrôle sur le call_number à se faire si la localisation est changée
    // Car il faut s'assurer que la cohérence soit conservée.
    this.form.get('location')?.valueChanges.subscribe(() => {
      this.form.get('call_number_value')?.updateValueAndValidity();
    });
  }

  
  /**
   * Soumet le formulaire de modification d'une holding.
   *
   * Cette méthode effectue les actions suivantes :
   *  1. Vérifie que le formulaire est valide (`this.form.valid`).
   *  2. Récupère les valeurs modifiées depuis le formulaire (`this.form.value`).
   *  3. Émet l'événement `holdingSaved` avec les données modifiées pour que le composant parent
   *     puisse les traiter (mise à jour ou enregistrement).
   *
   * @memberof MainComponent
   * @returns {void}
   */
  submit() {
    if (this.form.valid) {
      const updated = this.form.value;
      this.holdingSaved.emit(updated);
    }
  }

  /**
   * Annule l'édition en cours et prévient le composant parent.
   *
   * Cette méthode émet l'événement `formClosed` pour signaler que le formulaire doit être fermé
   * sans appliquer de modifications.
   *
   * @memberof MainComponent
   * @returns {void}
   */
  cancel() {
    this.formClosed.emit();
  }

  /**
   * Validateur synchrone pour vérifier la validité et la cohérence d'une cote (call number) dans le formulaire.
   *
   * Ce validateur fonctionne comme suit :
   * 1. Récupère la valeur du contrôle.
   * 2. Si la valeur est vide, renvoie `null` (pas d'erreur).
   * 3. Vérifie le format de la cote en utilisant `analyzeCallNumber` :
   *    - Si le format est invalide, renvoie `{ invalidCallNumber: true }`.
   * 4. Vérifie la cohérence de la cote avec la localisation choisie dans le formulaire parent :
   *    - Récupère la valeur du champ `location` du formulaire parent.
   *    - Si la localisation est définie, compare la première lettre de la cote avec la lettre initiale
   *      attendue de la localisation.
   *    - Si la première lettre de la cote ne correspond pas au préfixe de localisation, renvoie
   *      `{ callNumberLocationMismatch: true }`.
   * 5. Si aucune erreur n'est détectée, renvoie `null`.
   *
   * @private
   * @memberof MainComponent
   * @param {AbstractControl} control Le contrôle de formulaire contenant la cote à valider.
   * @returns {null | { invalidCallNumber?: true; callNumberLocationMismatch?: true }}
   *   `null` si la cote est valide, ou un objet indiquant le type d'erreur détecté.
   */
  private callNumberValidator = (control: AbstractControl) => {
    const value = control.value;
    if (!value) return null;

    // On récupère le formulaire parent pour lire la localisation
    const parent = control.parent;
    if (!parent) return null; // pas de valeur dans le formulaire : on s'arrête

    const locationValue = parent.get('location')?.value?.toString().trim();
    if (!locationValue) return null; 
    
    const locationPrefixMatch = locationValue.match(/^([A-H])-./i); // capture la lettre initiale

    // Si la localisation n'est pas définitive, on ne fait pas de contrôle de cohérence
    if (locationPrefixMatch) {
      // Premier contrôle : format de la cote
      try {
        analyzeCallNumber(value);
      } catch (e) {
        return { invalidCallNumber: true };
      }

      // Deuxième contrôle : cohérence de la cote avec la localisation
      const expectedPrefix = locationPrefixMatch[1].toUpperCase();
      const callNumberFirstLetter = value.charAt(0).toUpperCase();
      if (callNumberFirstLetter !== expectedPrefix) {
        return { callNumberLocationMismatch: true };
      }
    }

    return null; // aucune erreur trouvée
  };

  /**
   * Validateur asynchrone pour vérifier qu'une cote (call number) est valide dans Plac.
   *
   * Ce validateur fonctionne de la manière suivante :
   * 1. Récupère la valeur du contrôle et la normalise (trim).
   * 2. Si la valeur est vide, le validateur renvoie `null` (aucune erreur).
   * 3. Tente d'analyser la cote avec `analyzeCallNumber` pour déterminer si elle correspond à
   *    un code de lot ou de corpus.
   * 4. Si l'analyse échoue (format invalide), renvoie `null` : la validation de forme est
   *    considérée comme suffisante, inutile d'interroger Plac.
   * 5. Si l'analyse réussit, effectue un appel réseau vers `PlacService.get_by_code` pour
   *    vérifier la validité de la cote.
   * 6. Si la cote est valide dans Plac, renvoie `null` (pas d'erreur).
   * 7. Si la cote est invalide dans Plac ou qu'une erreur survient lors de l'appel réseau,
   *    renvoie un objet d'erreur `{ callNumberInvalidInPlac: { message, extract } }` 
   *    contenant un message et les informations extraites de la cote.
   *
   * @private
   * @memberof MainComponent
   * @param {AbstractControl} control Le contrôle de formulaire contenant la cote à valider.
   * @returns {Observable<null | { PlacConnexionError | callNumberInvalidInPlac: { message: string, extract: any } }>}
   *   Observable émettant `null` si la cote est valide, ou un objet d'erreur si elle est invalide.
   */
  private callNumberPlacValidator = (control: AbstractControl) => {
    const value = control.value?.toString().trim();
    if (!value) return of(null);

    // On tente d'extraire le code (lot ou corpus)
    let extract;
    try {
      extract = analyzeCallNumber(value);
    } catch {
      // Si déjà invalide au niveau forme, inutile d'interroger Plac
      return of(null);
    }

    // Appel réseau → validateur asynchrone
    return this.placService.get_by_code(extract.mainPart, extract.typeValue).pipe(
      map(() => null), // OK 
      catchError((error: HttpErrorResponse) => {
        if (error.status === 0) {
          // Erreur de connexion / serveur inaccessible
          return of({
            PlacConnexionError: {
              message: `Impossible de se connecter au serveur Plac : contactez l'administrateur.`,
              extract
            }
          });
        } else {
          // Le serveur a répondu mais la ressource est invalide
          return of({
            callNumberInvalidInPlac: {
              message: `Cote invalide dans Plac.`,
              extract
            }
          });
        }
      })
    );
  };
}
