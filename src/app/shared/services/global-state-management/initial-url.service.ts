import { Injectable } from "@angular/core";
import { ReplaySubject } from "rxjs";

// serves in global-state-management as notification for when the router has been initialised

@Injectable({
  providedIn: "root",
})
export class routerInitListenerService {
  routerHasInit$ = new ReplaySubject<string>(1);

  constructor() {}

  onRouterOutletActivation() {
    this.routerHasInit$.next("");
    this.routerHasInit$.complete();
  }
}
