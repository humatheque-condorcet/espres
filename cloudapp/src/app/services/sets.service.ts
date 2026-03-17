import { Injectable } from "@angular/core";
import { CloudAppRestService, HttpMethod } from "@exlibris/exl-cloudapp-angular-lib";
import { Observable } from "rxjs";
import { Set } from "../models/set";

@Injectable({
  providedIn: 'root'  
})
export class SetsService {
  constructor(private restService: CloudAppRestService) {}
  
  /**
   * Récupère un set unique depuis Alma via son lien.
   *
   * Cette méthode :
   *  1. Utilise le lien fourni (`link`) pour effectuer une requête GET vers le service REST.
   *  2. Retourne un `Observable<Holding>` émettant la holding correspondante telle que renvoyée par Alma.
   *
   * @param {string} link L'URL de la holding à récupérer.
   * @memberof HoldingsService
   * @returns {Observable<Holding>} Un Observable émettant la holding récupérée.
   */
  getSet (link: string): Observable<Set> {
    return this.restService.call(`${link}`);
  }
}