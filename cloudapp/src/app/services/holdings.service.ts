import { Injectable } from "@angular/core";
import { CloudAppRestService, HttpMethod } from "@exlibris/exl-cloudapp-angular-lib";
import { catchError, map, Observable, of } from "rxjs";
import { Holding } from "../models/holding";

/**
 * Service Angular responsable de la récupération des holdings depuis l'API Alma.
 *
 * Ce service encapsule les appels au `CloudAppRestService` afin de fournir
 * une interface typée pour manipuler les holdings.
 *
 * @providedIn root
 */
@Injectable({
  providedIn: 'root'  
})
export class HoldingsService {
  constructor(private restService: CloudAppRestService) {}
  
  /**
   * Récupère une holding unique depuis Alma via son lien.
   *
   * Cette méthode :
   *  1. Utilise le lien fourni (`link`) pour effectuer une requête GET vers le service REST.
   *  2. Retourne un `Observable<Holding>` émettant la holding correspondante telle que renvoyée par Alma.
   *
   * @param {string} link L'URL de la holding à récupérer.
   * @memberof HoldingsService
   * @returns {Observable<Holding>} Un Observable émettant la holding récupérée.
   */
  getHolding (link: string): Observable<Holding> {
    return this.restService.call(`${link}`);
  }

  /**
   * Compte le nombre total d'items associés à une holding spécifique dans Alma.
   *
   * Cette méthode :
   *  1. Construit l'URL de l'API Alma pour récupérer les items d'une holding donnée, en utilisant `mms_id` et `holding_id`.
   *  2. Effectue une requête GET via le service REST pour obtenir la réponse contenant les items.
   *  3. Si la réponse est valide et contient `total_record_count`, extrait ce champ pour obtenir le nombre total d'items.
   *  4. Si la réponse est vide, invalide ou ne contient pas `total_record_count`, retourne `0`.
   *  5. Retourne un `Observable<number>` émettant le nombre total d'items (ou `0` en cas d'erreur ou d'absence de réponse).
   *
   * @param {string} mms_id L'identifiant MMS de la notice bibliographique associée à la holding.
   * @param {string} holding_id L'identifiant de la holding pour laquelle compter les items.
   * @memberof [NomDeVotreService]
   * @returns {Observable<number>} Un Observable émettant le nombre total d'items associés à la holding, ou `0` si la réponse est invalide.
   */
  countItemsInHolding(mms_id: string, holding_id: string): Observable<number> {
    const link = `/bibs/${mms_id}/holdings/${holding_id}/items`;
    return this.restService.call(`${link}`).pipe(
      map((response: any) => {
        // Vérifie si la réponse existe et contient total_record_count
        if (response && typeof response.total_record_count === 'number') {
          return response.total_record_count;
        } else {
          return 0; // Retourne 0 si la réponse est invalide ou absente
        }
      }),
      catchError(() => of(0)) // En cas d'erreur HTTP, retourne 0
    );
  }


  /**
   * Envoie la mise à jour d'une holding à Alma via le service REST.
   *
   * Cette méthode :
   *  1. Utilise l'URL contenue dans `holding.link` pour adresser la requête PUT.
   *  2. Définit les en-têtes HTTP :
   *     - `Content-Type: application/xml` pour indiquer que le corps est du XML.
   *     - `Accept: application/json` pour demander la réponse au format JSON.
   *  3. Sérialise le tableau `holding.anies` dans un élément `<holding>` pour constituer le corps de la requête.
   *  4. Retourne un `Observable<Holding>` émettant la holding mise à jour telle que renvoyée par Alma.
   *
   * @param {Holding} holding La holding à mettre à jour dans Alma.
   * @memberof HoldingsService
   * @returns {Observable<Holding>} Un Observable émettant la holding mise à jour.
  */
  updateHolding( holding: Holding ): Observable<Holding> {
    return this.restService.call( {
      url: holding.link,
      headers: { 
        "Content-Type": "application/xml",
        Accept: "application/json" },
      requestBody: `<holding>${holding.anies}</holding>`,
      method: HttpMethod.PUT
    });
  } 

  /**
   * Met à jour les sous-champs MARC 852 `$c` (localisation) et `$h` (cote) d'une holding.
   *
   * Cette méthode fonctionne comme suit :
   *  1. Vérifie que le tableau `anies` de la holding contient au moins un élément XML.
   *     Si ce n’est pas le cas, un message d'erreur est logué et la méthode s'arrête.
   *  2. Parse le XML existant en utilisant `DOMParser`.
   *  3. Recherche le `datafield` avec le tag `852`.
   *     Si aucun `datafield 852` n’est trouvé, un message d'erreur est logué et la méthode s'arrête.
   *  4. Met à jour ou crée le subfield `c` avec la valeur de `value.location`.
   *  5. Met à jour ou crée le subfield `h` avec la valeur de `value.call_number_value`.
   *  6. Sérialise le document XML modifié en chaîne et remplace l’élément `anies[0]` par ce nouveau XML.
   *
   * @param {Holding} holding La holding dont le XML doit être mis à jour.
   * @param {{ location: string, call_number_value: string }} value Objet contenant :
   *   - `location` : la nouvelle localisation à écrire dans le subfield `c`.
   *   - `call_number_value` : (optionnel) la nouvelle cote à écrire dans le subfield `h`.
   * @memberof HoldingsService
   * @returns {void}
   */
  updateHoldingXml(holding: Holding, value: { location: string, call_number_value?: string }) {
    if (!holding.anies || !holding.anies[0]) {
      console.error("Aucun XML dans holding.anies");
      return;
    }

    const xmlString = holding.anies[0];
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlString, "application/xml");

    // Récupère le datafield 852
    const datafield852 = doc.querySelector('datafield[tag="852"]');
    if (!datafield852) {
      console.error("Aucun datafield 852 trouvé");
      return;
    }

    // Met à jour ou crée le subfield c
    let subfieldC = datafield852.querySelector('subfield[code="c"]');
    if (!subfieldC) {
      subfieldC = doc.createElement('subfield');
      subfieldC.setAttribute('code', 'c');
      datafield852.appendChild(subfieldC);
    }
    subfieldC.textContent = value.location;

    // Met à jour ou crée le subfield h
    if (value.call_number_value !== undefined) {
      let subfieldH = datafield852.querySelector('subfield[code="h"]');
      if (!subfieldH) {
        subfieldH = doc.createElement('subfield');
        subfieldH.setAttribute('code', 'h');
        datafield852.appendChild(subfieldH);
      }
      subfieldH.textContent = value.call_number_value;
    }

    // Sérialise de nouveau le XML
    const serializer = new XMLSerializer();
    holding.anies[0] = serializer.serializeToString(doc);
  }
}