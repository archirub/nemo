import { Injectable } from "@angular/core";
import { ReplaySubject } from "rxjs";

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
