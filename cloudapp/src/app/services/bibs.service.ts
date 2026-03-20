import { Injectable } from "@angular/core";
import { CloudAppRestService, HttpMethod } from "@exlibris/exl-cloudapp-angular-lib";
import { Observable } from "rxjs";
import { Bib } from "../models/bib";

/**
 * Service Angular responsable de la récupération des notices bibs depuis l'API Alma.
 *
 * Ce service encapsule les appels au `CloudAppRestService` afin de fournir
 * une interface typée pour manipuler les notices bibs.
 *
 * @providedIn root
 */
@Injectable({
  providedIn: 'root'  
})
export class BibsService {
  constructor(private restService: CloudAppRestService) {}

  /**
   * Récupère un enregistrement BIB unique depuis Alma via son MMS ID.
   *
   * Cette méthode :
   *  1. Utilise le MMS ID fourni (`mmsId`) pour effectuer une requête GET vers le service REST.
   *  2. Retourne un `Observable<Bib>` émettant le BIB correspondant.
   *
   * @param {string} mmsId L'identifiant MMS du BIB à récupérer.
   * @memberof BibsService
   * @returns {Observable<Bib>} Un Observable émettant le BIB récupéré.
   */
  getBib (mmsId: string): Observable<Bib> {
    return this.restService.call(`/bibs/${mmsId}`);
  }

  /**
   * Met à jour un enregistrement BIB existant avec le MARCXML fourni.
   *
   * Cette méthode :
   *  1. Sérialise les données MARCXML de l'objet `bib`.
   *  2. Envoie la mise à jour à Alma via une requête PUT.
   *  3. Retourne un `Observable<Bib>` émettant le BIB mis à jour.
   *
   * @param {Bib} bib L'objet BIB à mettre à jour.
   * @memberof BibsService
   * @returns {Observable<Bib>} Un Observable émettant le BIB mis à jour.
   */
  updateBib( bib: Bib ): Observable<Bib> {
    return this.restService.call( {
      url: `/bibs/${bib.mms_id}`,
      headers: { 
        "Content-Type": "application/xml",
        Accept: "application/json" },
      requestBody: `<bib>${bib.anies}</bib>`,
      method: HttpMethod.PUT
    });
  }
  
  /**
   * Récupère toutes les localisations possibles d'Alma pour la bibliothèque GED.
   *
   * Cette méthode :
   *  1. Effectue une requête GET vers l'endpoint `/conf/libraries/GED/locations`.
   *  2. Retourne un `Observable<any>` contenant la liste des localisations.
   *
   * @memberof BibsService
   * @returns {Observable<any>} Un Observable émettant la liste des localisations.
   */
  getLocations(): Observable<any> {
    return this.restService.call(`/conf/libraries/GED/locations`);
  }
}