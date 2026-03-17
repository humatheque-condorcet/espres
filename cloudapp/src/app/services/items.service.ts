import { Injectable } from "@angular/core";
import { CloudAppRestService, HttpMethod } from "@exlibris/exl-cloudapp-angular-lib";
import { Observable } from "rxjs";
import { map } from 'rxjs/operators';
import { Item } from '../models/item'


@Injectable({
  providedIn: 'root'  
})

export class ItemsService {
  constructor(private restService: CloudAppRestService) {}
  
  /**
   * Récupère un item unique depuis Alma via son lien.
   *
   * Cette méthode :
   *  1. Utilise le lien fourni (`link`) pour effectuer une requête GET vers le service REST.
   *  2. Retourne un `Observable<Item>` émettant l'item correspondant tel que renvoyé par Alma.
   *
   * @param {string} link L'URL de l'item à récupérer.
   * @memberof ItemsService
   * @returns {Observable<Item>} Un Observable émettant l'item récupéré. 
   */  
  getItem (link: string): Observable<Item> {
    return this.restService.call(`${link}`)
      .pipe(
        map((res: any) => (
          {
            mms_id: res.bib_data.mms_id,
            holding_id: res.holding_data.holding_id,
            item_id: res.item_data.pid,
            title: res.bib_data.title,
            permanent_call_number: res.holding_data.permanent_call_number
          }
        ))
      );
  }
}