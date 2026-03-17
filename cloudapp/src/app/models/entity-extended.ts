import { Entity } from "@exlibris/exl-cloudapp-angular-lib";
import { Item } from "./item";

export interface EntityExtended extends Entity {
  details: Item;
}
