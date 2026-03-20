/**
 * Interface représentant une notice d'exemplaire (Item) dans Alma.
 *
 * @interface Holding
 */
export interface Item {
  mms_id: string;
  holding_id: string;
  item_id: string;
  title: string;
  permanent_call_number: string;
  barcode: string;
  location: string;
}