import { Injectable } from "@angular/core";
import { CloudAppRestService, HttpMethod } from "@exlibris/exl-cloudapp-angular-lib";
import { Observable } from "rxjs";
import { Holding } from "../models/holding";

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
   *   - `call_number_value` : la nouvelle cote à écrire dans le subfield `h`.
   * @memberof HoldingsService
   * @returns {void}
   */
  updateHoldingXml(holding: Holding, value: { location: string, call_number_value: string }) {
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
    let subfieldH = datafield852.querySelector('subfield[code="h"]');
    if (!subfieldH) {
      subfieldH = doc.createElement('subfield');
      subfieldH.setAttribute('code', 'h');
      datafield852.appendChild(subfieldH);
    }
    subfieldH.textContent = value.call_number_value;

    // Sérialise de nouveau le XML
    const serializer = new XMLSerializer();
    holding.anies[0] = serializer.serializeToString(doc);
  }
}