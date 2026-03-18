import { Component, OnDestroy, OnInit } from '@angular/core';
import { AlertService, CloudAppEventsService,  EntityType, RestErrorResponse } from '@exlibris/exl-cloudapp-angular-lib';
import { BehaviorSubject, forkJoin, from, iif, Observable, of, Subscription } from 'rxjs';
import { switchMap, map, catchError, take, tap, finalize, mergeMap } from 'rxjs/operators';
import { EnrichedEntity } from '../types/enriched-entity.type';
import { EntityExtended } from '../models/entity-extended';
import { ItemsService } from '../services/items.service';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { getLocalisationFromCallNumber } from '../utils/getLocalisationFromCallNumber';
import { HoldingsService } from '../services/holdings.service';
import { Item } from '../models/item';

@Component({
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss']
})
export class MainComponent implements OnInit, OnDestroy {

  loading = false;
  displayedColumns: string[] = ['status', 'title', 'callNumber', 'barcode']; 
  dataSource: EnrichedEntity[] = [];

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
   *  2. Retourne un Observable contenant les entités enrichies se trouvant sur présentoir.
   *
   * @param {EnrichedEntity[]} entities - La liste des entités à enrichir.
   * @returns {Observable<EnrichedEntity[]>} Un Observable émettant la liste des entités enrichies.
   *
   * @memberof MainComponent
   */
  private fetchEntitiesDetails(entities: EnrichedEntity[]): Observable<EnrichedEntity[]> {
    const itemEntities = entities.filter(e => e.type === EntityType.ITEM);
    const setEntities = entities.filter(e => e.type === EntityType.SET);

    // Pour les entités de type ITEM, on récupère les détails et on indique que le traitement de déplacement de localisation n'est pas commencé
    const itemDetails$ = itemEntities.length > 0
      ? forkJoin(
          itemEntities.map(item =>
            this.itemsService.getItem(item.link).pipe(
              map(details => ({ 
                ...item, 
                details, 
                status: 'unstarted'
              })),
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
      // map(({ items, sets }) => [...items, ...sets])
      map(({ items, sets }) => {

        // On ne garde que les exemplaires sur présentoir
        const filteredItems = items.filter(
          (item): item is EnrichedEntity & { details: Item } => 
            !!item && this.isExtended(item) && item.details?.location.includes('PRSNTR')
        );
        return [...filteredItems, ...sets];
      })
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

    let successCount = 0;
    let errorCount = 0;

    // Initialisation des statuts
    this.dataSource.forEach(e => {
      if (this.isExtended(e)) {
        e.status = 'pending';
        e.error = null;
      }
    });

    this.loading = true;

    // this.dataSource doit être traité en flux RxJS et on en émet un à la fois
    // et on accepte d'en traiter 3 en parallèle maximum.
    from(this.dataSource).pipe(

      // Chaque entité émise par dataSource est déplacée vers sa localisation définitive
      mergeMap(entity => {
        if (!this.isExtended(entity)) {
          return of(null);
        }
        const mmsId = entity.details.mms_id;
        const holdingId = entity.details.holding_id;
        const callNumber = entity.details.permanent_call_number;
        const holdingLink = `/bibs/${mmsId}/holdings/${holdingId}`;

        // On cherche la holding, on la met à jour
        return this.holdingsService.getHolding(holdingLink).pipe(

          // Chaque holding est préparée pour la mise à jour 
          map(holding => {
            const localisation = getLocalisationFromCallNumber(callNumber);
            console.log(`Cote : ${entity.details.permanent_call_number}, localisation calculée : ${localisation}.`)
            this.holdingsService.updateHoldingXml(holding, { location: localisation });
            // Conserver le lien vers la holding pour le prochain appel API par updateHolding
            holding.link = holdingLink;
            return { holding, entity };
          }),

          // Puis elle est mise à jour effectivement dans Alma
          mergeMap(({ holding, entity }) =>
            this.holdingsService.updateHolding(holding).pipe(
              map(() => {
                entity.status = 'success';
                successCount++;
                return true;
              }),
              catchError(err => {
                console.log("erreur dans le premier mergeMap : ");
                console.log(err);
                entity.status = 'error';
                entity.error = err;
                errorCount++;
                return of(false);
              })
            )
          ),

          catchError(err => {
            console.log("erreur dans le second mergeMap : ");
            console.log(err);
            entity.status = 'error';
            entity.error = err;
            errorCount++;
            return of(false);
          })
        );

      }, 3), // <-- limite de concurrence (3 requêtes en parallèle)

      finalize(() => {
        this.loading = false;

        if (errorCount === 0) {
          this.alert.success(`Mise à jour réussie pour ${successCount} exemplaires.`);
        } else {
          this.alert.info(`Traitement terminé : ${successCount} réussis, ${errorCount} en erreur.`);
        }
      })
    ).subscribe();
  }
}
