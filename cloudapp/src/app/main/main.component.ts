import { Component, OnDestroy, OnInit } from '@angular/core';
import { AlertService,
  CloudAppEventsService,
  Entity,
  EntityType,
  PageInfo,
  RestErrorResponse } from '@exlibris/exl-cloudapp-angular-lib';
import { BehaviorSubject, forkJoin, iif, Observable, of, Subscription } from 'rxjs';
import { switchMap, map, catchError, take, tap, finalize } from 'rxjs/operators';
import { FormGroup, FormBuilder } from '@angular/forms';
import { EnrichedEntity } from '../types/enriched-entity.type';
import { EntityExtended } from '../models/entity-extended';
import { ItemsService } from '../services/items.service'

@Component({
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss']
})
export class MainComponent implements OnInit, OnDestroy {

  loading = false;

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
    private itemService: ItemsService
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
    // Démarrage du spinner de loading
    this.loading = true;

    this.entitiesSubscription = this.eventsService.entities$
      .pipe(
        switchMap(entities => {
          const found_entities = entities.filter(e => e.type === EntityType.ITEM || e.type === EntityType.SET);
          return iif(
            () => found_entities.length > 0,
            this.fetchEntitiesDetails(found_entities),
            of([])
          ).pipe(
            tap(() => this.loading = false) // Fin du loading
          );
        })
      )
      .subscribe((entities) => {
        if (!entities || entities.length === 0) {
          console.log("Aucune entité trouvée");
        }
        this.entitiesSubject.next(entities); // Met à jour le BehaviorSubject
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
            this.itemService.getItem(item.link).pipe(
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

  isExtended(entity: EnrichedEntity): entity is EntityExtended {
    return (entity as EntityExtended).details !== undefined;
  }
}
