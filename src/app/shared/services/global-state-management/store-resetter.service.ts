import { Injectable } from "@angular/core";
import { Subject } from "rxjs";

@Injectable({
  providedIn: "root",
})
export class StoreResetter {
  // observable for stores to subscribe to, and to empty when it emits a value
  private resetOnEmit = new Subject<"">();
  resetOnEmit$ = this.resetOnEmit.asObservable();

  constructor() {}

  // function to empty stores
  resetStores() {
    this.resetOnEmit.next("");
  }
}
