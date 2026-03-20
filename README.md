# ESPRES

**ESPRES** est une application Angular dédiée à la gestion des **exemplaires bibliographiques** dans Alma.  
Elle permet de déplacer des exemplaires entre localisations de type **présentoir** et **monographie**, tout en offrant un suivi visuel du statut de chaque opération.

---

## Table des matières

1. [Fonctionnalités](#fonctionnalités)  
2. [Installation](#installation)  
3. [Architecture](#architecture)  
4. [Utilisation](#utilisation)  
5. [Développement](#développement)  
6. [Documentation](#documentation)  
7. [Contribution](#contribution)  

---

## Fonctionnalités

- Écoute des événements liés aux entités depuis Alma via `CloudAppEventsService`.  
- Filtrage dynamique des exemplaires selon le mode de déplacement :  
  - **Vers monographie** (`toMonography`)  
  - **Vers présentoir** (`toPresentoir`)  
- Déplacement des exemplaires avec confirmation utilisateur via `MatDialog`.  
- Gestion du statut de chaque entité (`unstarted`, `pending`, `success`, `error`).  
- Affichage visuel du tableau des exemplaires avec :  
  - Titre, cote, code-barre  
  - Icônes ou spinner indiquant le statut  
- Gestion des erreurs et affichage dans la table.  
- Suivi du mode de déplacement via `BehaviorSubject` et `Observable`.  
- Support des localisations spécifiques (`presentoir`, `monographie`, `CTLES`).  

---

## Installation

Il faut installer le cli Cloud Apps d'ExLibris : [voir ici](https://developers.exlibrisgroup.com/cloudapps/started/)

Veuillez vous y reporter pour la configuration de l'application pour votre institution.

```bash
npm install -g @exlibris/exl-cloudapp-cli
```

Clonez le dépôt et installez les dépendances :

```bash
git clone <URL_DU_REPO>
cd espres
```

Lancez l'application en mode développement :

```bash
eca start
```

Accédez à l'application sur lien indiqué par l'output de la commande.

---

## Architecture

- **Composants** :  
  - `MainComponent` : composant principal pour la gestion des exemplaires.  
  - `NoEntitiesComponent` : affichage lorsque aucune entité n’est chargée.  
  - `ConfirmDialogComponent` : boîte de dialogue de confirmation des déplacements.  
- **Services** :  
  - `ItemsService` : récupération des détails des exemplaires.  
  - `HoldingsService` : gestion des holdings et mise à jour des localisations.  
  - `AlertService` : notifications à l’utilisateur.  
  - `CloudAppEventsService` : écoute des événements Alma.  
- **Types** :  
  - `EnrichedEntity`, `EntityExtended` : entités enrichies avec détails.  
  - `MoveMode` : `'toMonography' | 'toPresentoir'`.  
- **Pipes** :  
  - `TruncatePipe` : tronque les titres trop longs avec ellipses.  

L’architecture repose sur **RxJS** pour la gestion des flux d’entités et la mise à jour réactive de l’interface.

---

## Utilisation

### Sélection du mode de déplacement

```html
<mat-button-toggle-group [value]="mode$ | async" (change)="setMode($event.value)">
  <mat-button-toggle value="toMonography">Vers monographie</mat-button-toggle>
  <mat-button-toggle value="toPresentoir">Vers présentoir</mat-button-toggle>
</mat-button-toggle-group>
```

### Déplacement des exemplaires

```html
<button mat-flat-button color="primary"
        (click)="executeMove()"
        [disabled]="!(canExecuteMove$ | async)">
  {{ (mode$ | async) === 'toMonography'
      ? 'Remettre en localisation monographie'
      : 'Envoyer vers présentoir' }}
</button>
```

### Affichage des entités

```html
<table mat-table [dataSource]="filteredEntities$ | async">
  <!-- Colonnes : status, title, callNumber, barcode -->
</table>
```

Les icônes et spinner indiquent le statut de chaque exemplaire.

---

## Développement

Pour lancer l’environnement de développement :  

```bash
eca start
```

Pour générer la documentation avec [Compodoc](https://compodoc.app/) :  

```bash
npx compodoc -p tsconfig.json -s
```

La documentation inclut tous les composants, services et types avec leur JSDoc.

---

## Documentation

Tous les composants, services et types sont documentés via **JSDoc** pour assurer une **couverture maximale avec Compodoc**.  
Le rapport généré permet de visualiser les dépendances, les classes, et les flux RxJS utilis