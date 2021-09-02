import { Injectable, Inject, PLATFORM_ID } from "@angular/core";
import { Observable, fromEvent, merge, EMPTY, Subject, ReplaySubject } from "rxjs";
import { isPlatformBrowser } from "@angular/common";
import {
  filter,
  map,
  mapTo,
  multicast,
  refCount,
  share,
  shareReplay,
  startWith,
  switchMap,
  take,
  withLatestFrom,
} from "rxjs/operators";

@Injectable({
  providedIn: "root",
})
export class ConnectionService {
  private connectionMonitor: Observable<boolean>;

  constructor(@Inject(PLATFORM_ID) platform) {
    if (isPlatformBrowser(platform)) {
      const offline$ = fromEvent(window, "offline").pipe(mapTo(false));
      const online$ = fromEvent(window, "online").pipe(mapTo(true));
      this.connectionMonitor = merge(offline$, online$).pipe(
        startWith(window.navigator.onLine)
      );
    } else {
      this.connectionMonitor = EMPTY;
    }
  }

  monitor(): Observable<boolean> {
    return this.connectionMonitor;
  }

  /**
   * This is meant to be used as a RxJS operator. add it to a pipe whenever
   * you want the flow to wait for the connection to be up to keep going
   */
  waitUntilConnected() {
    return <T>(source: Observable<T>) => {
      return source.pipe(
        withLatestFrom(this.connectionMonitor.pipe(filter((isConnected) => isConnected))),
        map(([sourceValue, _]) => sourceValue)
      );
    };
  }

  /**
   * Observable which emits just once as soon as the connection is up
   */
  emitWhenConnected(): Observable<void> {
    return this.connectionMonitor.pipe(
      filter((isConnected) => isConnected),
      take(1),
      map(() => null)
    );
  }
}
