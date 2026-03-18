import { Component, OnDestroy, OnInit } from '@angular/core';
import { AlertService, CloudAppEventsService,  EntityType, RestErrorResponse } from '@exlibris/exl-cloudapp-angular-lib';
import { BehaviorSubject, forkJoin, iif, Observable, of, Subscription } from 'rxjs';
import { switchMap, map, catchError, take, tap, finalize } from 'rxjs/operators';
import { FormGroup, FormBuilder } from '@angular/forms';
import { EnrichedEntity } from '../types/enriched-entity.type';
import { EntityExtended } from '../models/entity-extended';
import { ItemsService } from '../services/items.service';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { getLocalisationFromCallNumber } from '../utils/getLocalisationFromCallNumber';
import { HoldingsService } from '../services/holdings.service';

@Component({
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss']
})
export class MainComponent implements OnInit, OnDestroy {

  loading = false;
  displayedColumns: string[] = ['title', 'callNumber', 'barcode']; 
  dataSource: EnrichedEntity[] = [];

  form!: FormGroup;
  form_display: boolean = false;

  /**
   * Sujet RxJS privé pour émettre les entités.
   *
   * @private
   * @type {BehaviorSubject<EnrichedEntity[] | null>}
   * @memberof MainComponent
   */
  private entitiesSubject = new BehaviorSubject<EnrichedEntity[] | null>(null);

  /**
   * Observable public des entities, issu du BehaviorSubject privé.
   *
   * @type {Observable<EnrichedEntity[] | null>}
   * @memberof MainComponent
   */
  entities$ = this.entitiesSubject.asObservable();

  /**
   * Subscription à l'Observable des entités.
   * Sert à se désabonner lors de la destruction du composant.
   *
   * @type {Subscription}
   * @memberof MainComponent
   */
  private entitiesSubscription!: Subscription;

  constructor(
    private fb: FormBuilder,
    private eventsService: CloudAppEventsService,
    private alert: AlertService,
    private holdingsService: HoldingsService,
    private itemsService: ItemsService,
    private dialog: MatDialog
  ) {}

  /**
   * Initialisation du composant.
   *
   * Cette méthode est appelée automatiquement par Angular après la création du composant.
   * Elle effectue les opérations suivantes :
   * 1. Active le spinner de chargement (`loading = true`).
   * 2. S'abonne à l'Observable des entités pour détecter les entités de type ITEM.
   *
   * @memberof MainComponent
   * @returns {void}
   */
  ngOnInit() {
    this.entitiesSubscription = this.eventsService.entities$
      .pipe(
        tap(() => this.loading = true), // Début du loading : démarrage du spinner
        switchMap(entities => {
          const found_entities = entities.filter(e => e.type === EntityType.ITEM || e.type === EntityType.SET);
          return iif(
            () => found_entities.length > 0,
            this.fetchEntitiesDetails(found_entities),
            of([])
          ).pipe(
            finalize(() => this.loading = false) // Fin du loading : arrêt du spinner
          );
        })
      )
      .subscribe((entities) => {
        if (!entities || entities.length === 0) {
          console.log("Aucune entité trouvée");
        }
        this.entitiesSubject.next(entities); // Met à jour le BehaviorSubject
        this.dataSource = entities;
      });
  }

  /**
   * Nettoyage lors de la destruction du composant.
   *
   * Cette méthode est appelée automatiquement par Angular lors de la destruction du composant.
   * Elle effectue les opérations suivantes :
   *  1. Se désabonne de l'abonnement à l'Observable des entités (`entitiesSubscription`)
   *     afin d'éviter les fuites de mémoire.
   *
   * @memberof MainComponent
   * @returns {void}
   */
  ngOnDestroy(): void {
    if (this.entitiesSubscription) {
      this.entitiesSubscription.unsubscribe();
    }
  }

  /**
   * Vérifie si une liste d'entités est vide ou null.
   *
   * Cette méthode effectue les actions suivantes :
   *  1. Retourne `true` si la liste d'entités est `null`.
   *  2. Retourne `true` si la liste d'entités est un tableau vide.
   *  3. Retourne `false` dans tous les autres cas.
   *
   * @param {EnrichedEntity[] | null} entities - La liste d'entités à vérifier.
   * @returns {boolean} `true` si la liste est vide ou `null`, `false` sinon.
   *
   * @memberof MainComponent
   */
  isEmpty(entities: EnrichedEntity[] | null): boolean {
    return entities === null || entities.length === 0;
  }

  /**
   * Ouvre un dialogue de confirmation avant de remettre les items en localisation monographie.
   *
   * Cette méthode effectue les opérations suivantes :
   *  1. Ouvre un dialogue Angular Material (`ConfirmDialogComponent`) avec une largeur de 400px.
   *  2. Attend la fermeture du dialogue via `afterClosed()` et récupère le résultat.
   *  3. Si l'utilisateur confirme (`result === true`), appelle la méthode `executeMoveToMonographyLocation()`
   *     pour effectuer le traitement réel.
   *
   * Cette approche permet de s'assurer que l'utilisateur valide explicitement l'action
   * avant de modifier les données.
   *
   * @memberof MainComponent
   * @returns {void}
   */
  moveToMonographyLocation(): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.executeMoveToMonographyLocation();
      }
    });
  }

  /**
   * Convertit une entité en une chaîne JSON formatée.
   *
   * Cette méthode effectue les actions suivantes :
   *  1. Convertit l'entité en une chaîne JSON.
   *  2. Formate la chaîne JSON pour une meilleure lisibilité.
   *
   * @param {EnrichedEntity} entity - L'entité à convertir en JSON.
   * @returns {string} La représentation JSON formatée de l'entité.
   *
   * @memberof MainComponent
   */
  formatEntityAsJson(entity: EnrichedEntity): string {
    return JSON.stringify(entity, null, 2);
  }

  /**
   * Vérifie si une entité est enrichie avec des détails supplémentaires.
   *
   * Cette méthode agit comme un *type guard* TypeScript et permet de distinguer :
   *  1. Les entités simples (`EnrichedEntity`) sans détails.
   *  2. Les entités étendues (`EntityExtended`) contenant une propriété `details`.
   *
   * Elle est notamment utile pour :
   *  - Accéder de manière sécurisée à la propriété `details` dans le template ou le code.
   *  - Bénéficier de l'inférence de type TypeScript après le test.
   *
   * @param {EnrichedEntity} entity - L'entité à vérifier.
   * @returns {boolean} `true` si l'entité contient des détails (`EntityExtended`), `false` sinon.
   *
   * @memberof MainComponent
   */
  isExtended(entity: EnrichedEntity): entity is EntityExtended {
    return (entity as EntityExtended).details !== undefined;
  }

  /**
   * Récupère les détails des entités.
   *
   * Cette méthode effectue les opérations suivantes :
   *  1. Pour chaque entité de type ITEM, récupère les détails via le service itemService.
   *  2. Retourne un Observable contenant les entités enrichies.
   *
   * @param {EnrichedEntity[]} entities - La liste des entités à enrichir.
   * @returns {Observable<EnrichedEntity[]>} Un Observable émettant la liste des entités enrichies.
   *
   * @memberof MainComponent
   */
  private fetchEntitiesDetails(entities: EnrichedEntity[]): Observable<EnrichedEntity[]> {
    const itemEntities = entities.filter(e => e.type === EntityType.ITEM);
    const setEntities = entities.filter(e => e.type === EntityType.SET);

    // Pour les entités de type ITEM, on récupère les détails
    const itemDetails$ = itemEntities.length > 0
      ? forkJoin(
          itemEntities.map(item =>
            this.itemsService.getItem(item.link).pipe(
              map(details => ({ ...item, details })),
              catchError(error => {
                console.error(`Erreur lors de la récupération des détails de l'item ${item.id}:`, error);
                return of(item); // Retourne l'item original en cas d'erreur
              } )
            )
          )
        )
      : of(itemEntities);

    // On combine les entités de type SET et les détails des entités de type ITEM
    return forkJoin({
      items: itemDetails$,
      sets: of(setEntities)
    }).pipe(
      map(({ items, sets }) => [...items, ...sets])
    );
  }

  /**
 * Pour chaque exemplaire, récupère la holding correspondante,
 * calcule la localisation monographique, met à jour le XML et envoie la holding mise à jour.
 * 
 * Gère les erreurs pour chaque exemplaire individuellement et affiche un message de succès
 * ou d'erreur détaillé à la fin du traitement.
 *
 * @private
 * @memberof MainComponent
 * @returns {void}
 */
  private executeMoveToMonographyLocation() {
    // Pour chaque exemplaire, nous allons :
    // - Récupérer la holding correspondant en appelant getHolding, le lien étant formés du mms_id et du holding_id : /bibs/{mms_id}/holdings/{holding_id}
    // - Calculer la localisation monographique en appelant getLocalisationFromCallNumber avec le permanent_call_number de l'exemplaire 
    // - Modifier dans la holding la localisation avec updateHoldingXml qu'il faut modifier pour ne modifier que le sous-champ c de la 852
    // - Mettre à jour la holding avec updateHolding
    //
    // Si on a des erreurs, sur l'une de ces opéartions, il faut conserver l'erreur et les informations de l'exemplaire concerné
    // A la fin du traitement si tout s'est passé sans erreur, on fait un message de succès indiquant le nombre d'exemplaires concernés
    // S'il y a eu une erreur au moins, on fait un message indiquant le nombre d'exemplaire concerné, le nombre d'exemplaires en erreur et le détail des erreurs par exemplaire. 

    if (!this.dataSource || this.dataSource.length === 0) {
      this.alert.info("Aucun exemplaire à traiter.");
      return;
    }
    
    const results: {
      success: boolean;
      entity: EnrichedEntity;
      error?: any;
    }[] = [];

    const observables = this.dataSource.map(entity => {
      // Ne traiter que les entités étendues (avec détails)
      if (!this.isExtended(entity)) {
        return of(null);
      }

      const mmsId = entity.details.mms_id;
      const holdingId = entity.details.holding_id;
      const callNumber = entity.details.permanent_call_number;
      const holdingLink = `/bibs/${mmsId}/holdings/${holdingId}`;

      return this.holdingsService.getHolding(holdingLink).pipe(
        map(holding => {
          // Calcule la localisation monographique
          const localisation = getLocalisationFromCallNumber(callNumber);

          // Met à jour le XML de la holding
          this.holdingsService.updateHoldingXml(holding, {
            location: localisation
          });

          return { holding, entity };
        }),

        // Met à jour la holding dans Alma
        switchMap(({ holding, entity }) =>
          this.holdingsService.updateHolding(holding).pipe(
            map(() => ({ success: true, entity, error: undefined })),
            catchError(err => {
              console.log('Erreur updateHolding :', err); // <-- log ici
              return of({ success: false, entity, error: err });
            })
          )
        ),
        catchError(err => {
          console.log('Erreur getHolding ou updateHoldingXml :', err); // <-- log ici
          return of({ success: false, entity, error: err });
        })
      );
    });
    // Lancer tous les traitements en parallèle
    forkJoin(observables).subscribe(resArray => {
      const successes = resArray.filter(r => r?.success);
      const failures = resArray.filter(r => r && !r.success);

      if (failures.length === 0) {
        this.alert.success(`Mise à jour réussie pour ${successes.length} exemplaires.`);
      } else {
        const detailErrors = failures.map(f => {
          const err = f?.error;

            const formattedError = err
              ? {
                  message: err.message,
                  stack: err.stack,
                  name: err.name
                }
              : null;

            console.log('Détail erreur exemplaire :', err);

            return {
              title: f?.entity?.details?.title || '-',
              error: formattedError
            };          
        });
        this.alert.info(
          `Traitement partiel : ${successes.length} réussis, ${failures.length} en erreur : ${ JSON.stringify(detailErrors, null, 2) }.`,
        );
      }
    });
  }  
}
