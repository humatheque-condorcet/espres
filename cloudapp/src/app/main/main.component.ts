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

  loading = false;

  displayedColumns: string[] = ['status', 'title', 'callNumber', 'barcode']; 

  private modeSubject = new BehaviorSubject<MoveMode>('toMonography');
  mode$ = this.modeSubject.asObservable();

  private entitiesSubject = new BehaviorSubject<EnrichedEntity[] | null>(null);
  entities$ = this.entitiesSubject.asObservable();

  filteredEntities$ = combineLatest([this.entities$, this.mode$]).pipe(
    map(([entities, mode]) => {
      if (!entities) return [];
      return this.filterByMode(entities, mode);
    })
  );

  allSuccess$ = this.filteredEntities$.pipe(
    map(items => {
      const extendedItems = items.filter(this.isExtended.bind(this));
      return extendedItems.length > 0 && extendedItems.every(e => e.status === 'success' || e.status === 'pending');
    })
  );

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

  setMode(mode: MoveMode) {
    this.modeSubject.next(mode);
  }

  private moveToMonographyLocation(): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, { width: '400px' });
    dialogRef.afterClosed().subscribe(result => {
      if (result) this.executeMoveToMonographyLocation();
    });
  }

  isExtended(entity: EnrichedEntity): entity is EntityExtended {
    return (entity as EntityExtended).details !== undefined;
  }

  private isPresentoirLocation(location?: string): boolean {
    return !!location && ['PRSNTR-N', 'PRSNTR-ED', 'PRSNTR-T'].some(p => location.includes(p));
  }

  private isMonographyOrCtlesLocation(location?: string): boolean {
    return !!location && ['MONOGRAP', 'CTLES'].some(p => location.includes(p));
  }

  private filterByMode(items: EnrichedEntity[], mode: MoveMode): (EnrichedEntity & { details: Item })[] {
    return items.filter(
      (item): item is EnrichedEntity & { details: Item } =>
        this.isExtended(item) &&
        (mode === 'toMonography'
          ? this.isPresentoirLocation(item.details.location)
          : this.isMonographyOrCtlesLocation(item.details.location))
    );
  }

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

  executeMove(): void {
    this.mode$.pipe(take(1)).subscribe(mode => {
      if (mode === 'toMonography') {
        this.moveToMonographyLocation();
      } else if (mode === 'toPresentoir') {
        this.executeMoveToPresentoirLocation();
      }
    });
  }

  private executeMoveToPresentoirLocation() {}

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