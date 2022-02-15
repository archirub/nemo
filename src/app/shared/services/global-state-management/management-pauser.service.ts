import { Injectable, OnDestroy } from "@angular/core";

import {
  BehaviorSubject,
  distinctUntilChanged,
  filter,
  firstValueFrom,
  map,
  mapTo,
  Observable,
  Subscription,
  switchMap,
  take,
} from "rxjs";
import { cloneDeep } from "lodash";

@Injectable({
  providedIn: "root",
})
export class ManagementPauser implements OnDestroy {
  private subs = new Subscription();

  private pauseGlobalManagement = new BehaviorSubject<boolean>(false);
  private pauseGlobalManagement$ = this.pauseGlobalManagement.pipe(
    distinctUntilChanged()
  );

  private requesters = new BehaviorSubject<string[]>([]);

  constructor() {
    this.subs.add(this.pausingHandler().subscribe());
  }

  // for use in global state management, for it to only continue its logic if "pauseGlobalManagement" gives false
  public checkForPaused =
    <T>() =>
    (source: Observable<T>) =>
      source.pipe(
        switchMap((val) =>
          this.pauseGlobalManagement$.pipe(
            filter((isPaused) => !isPaused),
            take(1),
            mapTo(val)
          )
        )
      );

  public requestPause(requestId: string) {
    return firstValueFrom(
      this.requesters.pipe(
        take(1),
        map((req) => {
          if (req.indexOf(requestId) !== -1) return;

          const newRequesters = cloneDeep(req);
          newRequesters.push(requestId);
          this.requesters.next(newRequesters);
        })
      )
    );
  }

  public unrequestPause(requestId: string) {
    return firstValueFrom(
      this.requesters.pipe(
        take(1),
        map((req) => {
          if (req.indexOf(requestId) === -1) return;

          this.requesters.next(req.filter((id) => id !== requestId));
        })
      )
    );
  }

  private pausingHandler() {
    return this.requesters.pipe(
      map((req) => this.pauseGlobalManagement.next(req.length > 0))
    );
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }
}
