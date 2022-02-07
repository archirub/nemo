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
import { wait } from "../../functions/common";

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

    await wait(1000);

    await midTask();

    this.resetOnEmit.next("");

    await wait(200);
  }
}
