import { Platform } from "@ionic/angular";
import { Component, OnInit, OnDestroy } from "@angular/core";

import { AngularFireAuth } from "@angular/fire/auth";
import { Plugins, Capacitor } from "@capacitor/core";
import { Subscription } from "rxjs";

import { GlobalStateManagementService } from "@services/global-state-management/global-state-management.service";
import { routerInitListenerService } from "@services/global-state-management/initial-url.service";
import { StoreReadinessService } from "@services/store-readiness/store-readiness.service";
import { filter, first } from "rxjs/operators";

@Component({
  selector: "app-root",
  templateUrl: "app.component.html",
  styleUrls: ["app.component.scss"],
})
export class AppComponent implements OnDestroy, OnInit {
  private appGlobalStateManagementSub: Subscription;

  constructor(
    private platform: Platform,
    private afAuth: AngularFireAuth,
    private GlobalStateManagement: GlobalStateManagementService,
    private routerInitListener: routerInitListenerService, // don't remove, used in template
    private storeReadiness: StoreReadinessService
  ) {
    this.initializeApp();
  }

  ngOnInit() {
    this.afAuth.authState.subscribe((a) => console.log("change in authstate: ", a));
    this.GlobalStateManagement.userState$.subscribe((a) =>
      console.log("user state is", a)
    );
  }

  ngOnDestroy(): void {
    this.appGlobalStateManagementSub?.unsubscribe();
  }

  async initializeApp() {
    console.log("yo");
    if (Capacitor.isPluginAvailable("SplashScreen")) {
      console.log("ya");
      await Plugins.SplashScreen.show();
    }
    await this.platform.ready();

    this.startGlobalStateManagement();

    const userStateSnapshot = await this.GlobalStateManagement.userState$
      .pipe(first())
      .toPromise();

    if (userStateSnapshot === "full") await this.storesReady();

    if (Capacitor.isPluginAvailable("SplashScreen")) {
      return Plugins.SplashScreen.hide();
    }
  }

  startGlobalStateManagement() {
    this.appGlobalStateManagementSub = this.GlobalStateManagement.activate().subscribe();
  }

  /**
   * Returns a promise when the stores are ready
   */
  storesReady() {
    return this.storeReadiness.app$
      .pipe(
        filter((isReady) => isReady),
        first()
      )
      .toPromise();
  }

  onRouterOutletActivation() {
    this.routerInitListener.onRouterOutletActivation();
  }
}
