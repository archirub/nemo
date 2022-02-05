import { Injectable } from "@angular/core";
import {
  debounce,
  debounceTime,
  delay,
  EMPTY,
  interval,
  Observable,
  observable,
  of,
  Subject,
  switchMapTo,
  tap,
} from "rxjs";

@Injectable({
  providedIn: "root",
})
export class StoreResetter {
  // observable for stores to subscribe to, and to empty when it emits a value
  private resetOnEmit = new Subject<"">();
  private deactivateOnEmit = new Subject<"">();

  resetOnEmit$ = this.resetOnEmit.pipe(debounceTime(1000)); // for resetting stores
  deactivateOnEmit$ = this.deactivateOnEmit.pipe(debounceTime(1000)); // for unsubscribing from stores

  constructor() {}

  async resetStores(midTask: () => Promise<any>): Promise<void> {
    this.deactivateOnEmit.next("");

    await later(1000);

    await midTask();

    this.resetOnEmit.next("");

    await later(200);
  }
}

function later(delay) {
  return new Promise(function (resolve) {
    setTimeout(resolve, delay);
  });
}
