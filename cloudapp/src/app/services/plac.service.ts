import { Injectable } from '@angular/core'
import { HttpClient, HttpHeaders, HttpParams  } from "@angular/common/http"
import { Resource } from '../models/resource'
import { Observable } from 'rxjs'
import { environment } from '../environment'

/**
 * Provides services for call numbers, using Plac
 */

@Injectable({
  providedIn: 'root'
})

export class PlacService {
  BASE_URL: string = `${environment.placURL}`

  constructor(private http: HttpClient) {}

  /**
   * Récupère un lot ou un corpus à partir du code d'une ressource.
   *
   * Cette méthode fonctionne comme suit :
   *  1. Reçoit un code (`code`) et un type de ressource (`typeResource`) qui peut être `"lot"` ou `"corpus"`.
   *  2. Convertit `"lot"` en `"lots"` et `"corpus"` en `"corpora"` pour correspondre aux endpoints Alma.
   *  3. Effectue une requête GET vers l'endpoint correspondant pour récupérer la ressource.
   *  4. Retourne un `Observable<Resource>` émettant la ressource correspondante.
   *
   * @param {string} [code=""] Le code du lot ou du corpus à récupérer.
   * @param {string} [typeResource=""] Le type de ressource : `"lot"` ou `"corpus"`.
   * @memberof PlacService
   * @returns {Observable<Resource>} Un Observable émettant la ressource récupérée.
   */
  get_by_code(code: string = "", typeResource: string = ""): Observable<Resource> {
    typeResource = typeResource === "lot" ? "lots" : "corpora";
   
    return this.http.get<Resource>(`${this.BASE_URL}/${typeResource}/code/${code}`)
  }
}