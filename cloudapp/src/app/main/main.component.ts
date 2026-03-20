import { Component } from '@angular/core';
import { AlertService, CloudAppEventsService, EntityType } from '@exlibris/exl-cloudapp-angular-lib';
import { BehaviorSubject, combineLatest, forkJoin, from, iif, of } from 'rxjs';
import { switchMap, map, catchError, finalize, mergeMap, tap, take } from 'rxjs/operators';
import { EnrichedEntity } from '../types/enriched-entity.type';
import { EntityExtended } from '../models/entity-extended';
import { ItemsService } from '../services/items.service';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { getLocalisationFromCallNumber } from '../utils/getLocalisationFromCallNumber';
import { HoldingsService } from '../services/holdings.service';
import { Item } from '../models/item';
import { MoveMode } from '../types/move-mode.type';

@Component({
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss']
})
export class MainComponent {
  /** Indicateur de chargement en cours. */
  loading = false;

  /** Colonnes affichées dans le tableau des entités. */
  displayedColumns: string[] = ['status', 'title', 'callNumber', 'barcode']; 
 
  /** Liste des localisations de type "présentoir". */ 
  presentoirLocations: string [] = ['PRSNTR-N', 'PRSNTR-ED', 'PRSNTR-T'];
  
  /** Sujet gérant le mode de déplacement actuel. */ 
  private modeSubject = new BehaviorSubject<MoveMode>('toMonography');
  /** Observable exposant le mode de déplacement actuel. */ 
  mode$ = this.modeSubject.asObservable();
  
  /** Sujet gérant la liste des entités chargées. */
  private entitiesSubject = new BehaviorSubject<EnrichedEntity[] | null>(null);
  
  /** Observable exposant la liste des entités chargées. */
  entities$ = this.entitiesSubject.asObservable();

  /**
   * Observable combinant les entités et le mode de déplacement pour fournir une liste filtrée d'entités.
   *
   * Cet Observable :
   *  1. Combine les dernières valeurs de `entities$` et `mode$` via `combineLatest`.
   *  2. Filtre les entités en fonction du mode de déplacement actuel, en utilisant la méthode `filterByMode`.
   *  3. Retourne un tableau vide si `entities` est `null` ou `undefined`.
   *  4. Émet un tableau d'entités filtrées à chaque changement de mode ou de liste d'entités.
   *
   * @memberof MainComponent
   * @type {Observable<(EnrichedEntity & { details: Item })[]>}
   */
  filteredEntities$ = combineLatest([this.entities$, this.mode$]).pipe(
    map(([entities, mode]) => {
      if (!entities) return [];
      return this.filterByMode(entities, mode);
    })
  );

  /**
   * Observable indiquant si toutes les entités étendues ont un statut de succès ou sont en attente.
   *
   * Cet Observable :
   *  1. Écoute les changements dans `filteredEntities$`.
   *  2. Filtre les entités pour ne conserver que celles étendues (avec détails) en utilisant `isExtended`.
   *  3. Vérifie si toutes les entités étendues ont un statut "success" ou "pending".
   *  4. Retourne `true` si toutes les entités étendues ont un statut valide et qu'il y a au moins une entité étendue, sinon `false`.
   *
   * @memberof MainComponent
   * @type {Observable<boolean>}
   */
  allSuccess$ = this.filteredEntities$.pipe(
    map(items => {
      const extendedItems = items.filter(this.isExtended.bind(this));
      return extendedItems.length > 0 && extendedItems.every(e => e.status === 'success' || e.status === 'pending');
    })
  );

  /**
   * Observable déterminant si le déplacement des entités peut être exécuté.
   *
   * Cet Observable :
   *  1. Combine les dernières valeurs de `allSuccess$` et `filteredEntities$` via `combineLatest`.
   *  2. Retourne `true` si :
   *     - Il existe des entités filtrées (`filteredEntities.length > 0`).
   *     - Toutes les entités ne sont pas déjà dans un état de succès (`!allSuccess`).
   *  3. Permet de désactiver les actions de déplacement si toutes les entités sont déjà traitées avec succès ou s'il n'y a aucune entité à traiter.
   *
   * @memberof MainComponent
   * @type {Observable<boolean>}
   */
  canExecuteMove$ = combineLatest([this.allSuccess$, this.filteredEntities$]).pipe(
    map(([allSuccess, filteredEntities]) => {
      return !allSuccess && filteredEntities.length > 0;
    })
  );

  /**
   * Constructeur du composant principal.
   * Initialise les services nécessaires et configure l'écoute des événements pour le chargement des entités.
   *
   * Ce constructeur :
   *  1. Injecte les services requis :
   *     - `CloudAppEventsService` pour écouter les événements liés aux entités.
   *     - `AlertService` pour afficher des notifications à l'utilisateur.
   *     - `HoldingsService` et `ItemsService` pour interagir avec les données des localisations et des exemplaires.
   *     - `MatDialog` pour gérer les boîtes de dialogue.
   *  2. Souscrit aux événements d'entités via `eventsService.entities$` :
   *     - Active l'indicateur de chargement (`this.loading = true`) au début du traitement.
   *     - Filtre les entités pour ne conserver que celles de type "ITEM".
   *     - Si des entités de type "ITEM" sont trouvées, récupère leurs détails via `fetchEntitiesDetails`.
   *     - Si aucune entité de type "ITEM" n'est trouvée, retourne un tableau vide.
   *     - Désactive l'indicateur de chargement (`this.loading = false`) à la fin du traitement.
   *     - Met à jour la liste des entités dans `entitiesSubject` avec les résultats obtenus.
   *
   * @param {CloudAppEventsService} eventsService Service pour écouter les événements liés aux entités.
   * @param {AlertService} alert Service pour afficher des alertes et notifications.
   * @param {HoldingsService} holdingsService Service pour gérer les données des localisations (holdings).
   * @param {ItemsService} itemsService Service pour gérer les données des exemplaires (items).
   * @param {MatDialog} dialog Service pour gérer les boîtes de dialogue.
   * @memberof MainComponent
   */
  constructor(
    private eventsService: CloudAppEventsService,
    private alert: AlertService,
    private holdingsService: HoldingsService,
    private itemsService: ItemsService,
    private dialog: MatDialog
  ) {
    // Chargement initial
    this.eventsService.entities$
      .pipe(
        tap(() => this.loading = true),
        switchMap(entities => {
          const foundEntities = entities.filter(e => e.type === EntityType.ITEM);
          return iif(
            () => foundEntities.length > 0,
            this.fetchEntitiesDetails(foundEntities),
            of([])
          ).pipe(finalize(() => this.loading = false));
        })
      )
      .subscribe(entities => this.entitiesSubject.next(entities));
  }

  /**
   * Définit le mode de déplacement actuel pour l'application.
   *
   * Cette méthode met à jour le sujet (`Subject`) `modeSubject` avec le nouveau mode de déplacement spécifié.
   * Cela permet de notifier tous les observateurs abonnés à ce sujet du changement de mode,
   * déclenchant ainsi les mises à jour nécessaires dans l'interface utilisateur ou la logique métier.
   *
   * @param {MoveMode} mode Le mode de déplacement à appliquer ("toMonography" ou "toPresentoir").
   * @memberof MainComponent
   */
  setMode(mode: MoveMode) {
    this.modeSubject.next(mode);
  }

  /**
   * Vérifie si une entité est étendue, c'est-à-dire si elle contient des détails supplémentaires.
   *
   * Cette méthode détermine si l'entité passée en paramètre
   * possède une propriété `details` définie, indiquant qu'il s'agit d'une entité étendue (`EntityExtended`).
   * Cela permet de faire la distinction entre les entités basiques et les entités enrichies avec des détails.
   *
   * @param {EnrichedEntity} entity L'entité à vérifier.
   * @memberof MainComponent
   * @returns {entity is EntityExtended} `true` si l'entité contient des détails et est donc étendue, sinon `false`.
   */
  isExtended(entity: EnrichedEntity): entity is EntityExtended {
    return (entity as EntityExtended).details !== undefined;
  }

  /**
   * Vérifie si une localisation est de type "présentoir".
   *
   * @param {string | undefined} location - Localisation à vérifier.
   * @memberof MainComponent
   * @returns {boolean} `true` si la localisation contient une des valeurs de `this.presentoirLocations`, sinon `false`.
   */
  private isPresentoirLocation(location?: string): boolean {
    return !!location && this.presentoirLocations.some(p => location.includes(p));
  }

  /**
   * Vérifie si une localisation donnée correspond à une localisation de type "monographie" ou "CTLES".
   *
   * Cette méthode :
   *  1. Vérifie que la localisation fournie existe et n'est pas vide.
   *  2. Retourne `true` si la localisation contient l'une des chaînes suivantes : "MONOGRAP" ou "CTLES".
   *  3. Retourne `false` dans tous les autres cas (localisation vide, `null`, `undefined`, ou ne contenant pas les chaînes attendues).
   *
   * @param {string | undefined} location La localisation à vérifier.
   * @memberof MainComponent
   * @returns {boolean} `true` si la localisation est de type "monographie" ou "CTLES", `false` sinon.
   */
  private isMonographyOrCtlesLocation(location?: string): boolean {
    return !!location && ['MONOGRAP', 'CTLES'].some(p => location.includes(p));
  }

  /**
   * Filtre les entités en fonction du mode de déplacement sélectionné et de leur localisation actuelle.
   *
   * Cette méthode :
   *  1. Filtre les entités pour ne conserver que celles qui sont étendues (avec détails) via `isExtended`.
   *  2. Selon le mode de déplacement spécifié :
   *     - Si le mode est "toMonography", conserve uniquement les entités dont la localisation est de type "présentoir" (`isPresentoirLocation`).
   *     - Si le mode est "toPresentoir", conserve uniquement les entités dont la localisation est de type "monographie" ou "CTLES" (`isMonographyOrCtlesLocation`).
   *  3. Retourne un tableau d'entités filtrées et typées comme ayant des détails de type `Item`.
   *
   * @param {EnrichedEntity[]} items Tableau d'entités à filtrer.
   * @param {MoveMode} mode Mode de déplacement ("toMonography" ou "toPresentoir") déterminant le filtre de localisation à appliquer.
   * @memberof MainComponent
   * @returns {(EnrichedEntity & { details: Item })[]} Tableau d'entités filtrées et étendues avec leurs détails.
   */
  private filterByMode(items: EnrichedEntity[], mode: MoveMode): (EnrichedEntity & { details: Item })[] {
    return items.filter(
      (item): item is EnrichedEntity & { details: Item } =>
        this.isExtended(item) &&
        (mode === 'toMonography'
          ? this.isPresentoirLocation(item.details.location)
          : this.isMonographyOrCtlesLocation(item.details.location))
    );
  }

  /**
   * Récupère les détails des entités de type "ITEM" à partir de leurs liens respectifs.
   *
   * Cette méthode :
   *  1. Filtre les entités pour ne conserver que celles de type "ITEM".
   *  2. Si des entités de type "ITEM" sont présentes :
   *     a. Effectue une requête parallèle pour récupérer les détails de chaque item via `itemsService.getItem`.
   *     b. Enrichit chaque item avec ses détails et un statut initial "unstarted".
   *     c. En cas d'erreur lors de la récupération des détails, conserve l'item original sans détails.
   *  3. Si aucune entité de type "ITEM" n'est présente, retourne directement le tableau vide.
   *  4. Combine les résultats des requêtes parallèles et filtre les items pour ne conserver que ceux qui ont été enrichis avec des détails.
   *  5. Retourne un `Observable` émettant un tableau d'entités enrichies avec leurs détails.
   *
   * @param {EnrichedEntity[]} entities Tableau d'entités à traiter.
   * @memberof MainComponent
   * @returns {Observable<(EnrichedEntity & { details: Item })[]>} Un Observable émettant un tableau d'entités enrichies avec leurs détails.
   */
  private fetchEntitiesDetails(entities: EnrichedEntity[]) {
    const itemEntities = entities.filter(e => e.type === EntityType.ITEM);
    const itemDetails$ = itemEntities.length
      ? forkJoin(
          itemEntities.map(item =>
            this.itemsService.getItem(item.link).pipe(
              map(details => ({ ...item, details, status: 'unstarted' })),
              catchError(() => of(item))
            )
          )
        )
      : of(itemEntities);

    return forkJoin({ items: itemDetails$ }).pipe(
      map(({ items }) => items.filter((item): item is EnrichedEntity & { details: Item } => this.isExtended(item)))
    );
  }

  /**
   * Exécute le déplacement des exemplaires en fonction du mode de déplacement sélectionné.
   *
   * Cette méthode :
   *  1. Récupère le mode de déplacement actuel (via `mode$`) en utilisant `take(1)` pour ne prendre qu'une seule émission.
   *  2. Selon le mode sélectionné :
   *     - Si le mode est "toMonography", appelle `moveToMonographyLocation` pour déclencher le déplacement vers une localisation monographie.
   *     - Si le mode est "toPresentoir", appelle `executeMoveToPresentoirLocation` pour déclencher le déplacement vers un présentoir.
   *
   * @memberof MainComponent
   */
  executeMove(): void {
    this.mode$.pipe(take(1)).subscribe(mode => {
      if (mode === 'toMonography') {
        this.moveToMonographyLocation();
      } else if (mode === 'toPresentoir') {
        this.executeMoveToPresentoirLocation();
      }
    });
  }

  /**
   * Ouvre une boîte de dialogue de confirmation pour demander à l'utilisateur de confirmer
   * le déplacement des exemplaires vers une localisation de type "monographie".
   *
   * Cette méthode :
   *  1. Ouvre un dialogue de confirmation via `MatDialog` avec le composant `ConfirmDialogComponent`.
   *  2. Passe un objet de données au dialogue indiquant que le mode "présentoir" est désactivé (`isPresentoirMode: false`).
   *  3. Après la fermeture du dialogue, vérifie si l'utilisateur a confirmé l'action.
   *  4. Si l'utilisateur confirme (resultat `true`), exécute la méthode `executeMoveToMonographyLocation` pour effectuer le déplacement.
   *
   * @memberof MainComponent
   */
  private moveToMonographyLocation(): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, { 
      width: '400px',
      data: {
        isPresentoirMode: false
      }
    });
    dialogRef.afterClosed().subscribe(result => {
      // Ici result est un booléen
      if (result) this.executeMoveToMonographyLocation();
    });
  }

  /**
   * Ouvre une boîte de dialogue de confirmation pour demander à l'utilisateur de confirmer
   * le déplacement des exemplaires vers une localisation de type "présentoir".
   *
   * Cette méthode :
   *  1. Ouvre un dialogue de confirmation via `MatDialog` avec le composant `ConfirmDialogComponent`.
   *  2. Passe un objet de données au dialogue indiquant que le mode "présentoir" est activé (`isPresentoirMode: true`).
   *  3. Fournit également la liste des localisations de présentoir disponibles (`presentoirLocations`).
   *  4. Après la fermeture du dialogue, vérifie si l'utilisateur a sélectionné une localisation (resultat de type `string`).
   *  5. Si une localisation est sélectionnée, exécute la méthode `executeMoveToPresentoirWithLocation` avec cette localisation.
   *
   * @memberof MainComponent
   */
  private executeMoveToPresentoirLocation() {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        isPresentoirMode: true,
        presentoirLocations: this.presentoirLocations // Liste des localisations possibles
      }
    });

    dialogRef.afterClosed().subscribe((result: string | boolean) => {
      if (result && typeof result === 'string') {
        // Ici, `result` contient la localisation sélectionnée
        this.executeMoveToPresentoirWithLocation(result);
      }
    });
  }

  /**
   * Exécute le déplacement des exemplaires sélectionnés vers une localisation de type "présentoir" avec une destination spécifique.
   *
   * Cette méthode fonctionne comme suit :
   *  1. Récupère la liste des entités filtrées via `filteredEntities$` et prend uniquement la première émission avec `take(1)`.
   *  2. Met à jour le statut de chaque entité à "pending" et réinitialise les erreurs éventuelles.
   *  3. Pour chaque entité étendue (avec détails) :
   *     a. Vérifie le nombre d'items associés à la holding via `holdingsService.countItemsInHolding`.
   *     b. Si la holding contient plus d'un item, enregistre une erreur sur l'entité et arrête le traitement pour cet item.
   *        Le message d'erreur indique que la mise en présentoire doit être effectuée manuellement.
   *     c. Si la holding contient un seul item, continue le traitement :
   *        - Récupère la holding associée via `holdingsService.getHolding`.
   *        - Met à jour le XML de la holding avec la nouvelle localisation (destination spécifiée en paramètre).
   *        - Envoie la mise à jour de la holding via `holdingsService.updateHolding`.
   *        - Met à jour le statut de l'entité en "success" si la mise à jour réussit, ou en "error" en cas d'échec.
   *  4. Gère les erreurs éventuelles lors des appels aux services et met à jour le statut des entités concernées.
   *  5. Met à jour la liste des entités dans `entitiesSubject` à la fin du traitement, quel que soit le résultat.
   *  6. Limite le nombre de requêtes simultanées à 3 pour éviter de surcharger le serveur.
   *
   * @param {string} destination La localisation de destination pour le déplacement vers le présentoir.
   * @memberof MainComponent
   */
  private executeMoveToPresentoirWithLocation(destination: string) {
    this.filteredEntities$.pipe(
      take(1),
      tap(items => items.forEach(e => { if (this.isExtended(e)) { e.status = 'pending'; e.error = null; } })),
      switchMap(items => from(items).pipe(
        mergeMap(entity => {
          if (!this.isExtended(entity)) return of(null);

          const { mms_id, holding_id, permanent_call_number } = entity.details;
          const link = `/bibs/${mms_id}/holdings/${holding_id}`;

          // Vérification du nombre d'items dans la holding
          return this.holdingsService.countItemsInHolding(mms_id, holding_id).pipe(
            switchMap(totalItems => {
              if (totalItems > 1) {
                // Si plus d'un exemplaire on enregistre une erreur et on ne continue pas
                entity.status = 'error';
                entity.error = new Error("Cet exemplaire est attaché à une holding comportant d'autres exemplaires : la mise en présentoire doit être faite manuellement !");
                return of(false);
              } else {
                // Sinon, on continue avec le traitement normal
                return this.holdingsService.getHolding(link).pipe(
                  map(holding => {
                    const localisation = destination;
                    this.holdingsService.updateHoldingXml(holding, { location: localisation });
                    holding.link = link;
                    return { holding, entity };
                  }),
                  mergeMap(({ holding, entity }) =>
                    this.holdingsService.updateHolding(holding).pipe(
                      map(() => { entity.status = 'success'; return true; }),
                      catchError(err => { entity.status = 'error'; entity.error = err; return of(false); })
                    )
                  ),
                  catchError(err => { entity.status = 'error'; entity.error = err; return of(false); })
                );
              }
            })
          );
        }, 3),
        finalize(() => this.entitiesSubject.next([...this.entitiesSubject.value ?? []]))
      ))
    ).subscribe();
  }

  /**
   * Exécute le déplacement des exemplaires sélectionnés vers une localisation de type "monographie".
   *
   * Cette méthode fonctionne comme suit :
   *  1. Récupère la liste des entités filtrées via `filteredEntities$` et prend uniquement la première émission avec `take(1)`.
   *  2. Met à jour le statut de chaque entité à "pending" et réinitialise les erreurs éventuelles.
   *  3. Pour chaque entité étendue (avec détails) :
   *     a. Récupère la holding associée via `holdingsService.getHolding`.
   *     b. Met à jour le XML de la holding avec la nouvelle localisation, calculée à partir de la cote permanente (`permanent_call_number`).
   *     c. Envoie la mise à jour de la holding via `holdingsService.updateHolding`.
   *     d. Met à jour le statut de l'entité en "success" si la mise à jour réussit, ou en "error" en cas d'échec.
   *  4. Gère les erreurs éventuelles lors des appels aux services et met à jour le statut des entités concernées.
   *  5. Met à jour la liste des entités dans `entitiesSubject` à la fin du traitement, quel que soit le résultat.
   *  6. Limite le nombre de requêtes simultanées à 3 pour éviter de surcharger le serveur.
   *
   * @memberof MainComponent
   */
  private executeMoveToMonographyLocation() {
    this.filteredEntities$.pipe(
      take(1),
      tap(items => items.forEach(e => { if (this.isExtended(e)) { e.status = 'pending'; e.error = null; } })),
      switchMap(items => from(items).pipe(
        mergeMap(entity => {
          if (!this.isExtended(entity)) return of(null);
          const { mms_id, holding_id, permanent_call_number } = entity.details;
          const link = `/bibs/${mms_id}/holdings/${holding_id}`;

          return this.holdingsService.getHolding(link).pipe(
            map(holding => {
              const localisation = getLocalisationFromCallNumber(permanent_call_number);
              this.holdingsService.updateHoldingXml(holding, { location: localisation });
              holding.link = link;
              return { holding, entity };
            }),
            mergeMap(({ holding, entity }) =>
              this.holdingsService.updateHolding(holding).pipe(
                map(() => { entity.status = 'success'; return true; }),
                catchError(err => { entity.status = 'error'; entity.error = err; return of(false); })
              )
            ),
            catchError(err => { entity.status = 'error'; entity.error = err; return of(false); })
          );
        }, 3),
        finalize(() => this.entitiesSubject.next([...this.entitiesSubject.value ?? []]))
      ))
    ).subscribe();
  }
}