import { Platform } from "@ionic/angular";
import { Component, OnInit, OnDestroy } from "@angular/core";
import { AngularFireAuth } from "@angular/fire/auth";

import { HideOptions, ShowOptions, SplashScreen } from "@capacitor/splash-screen";

import { firstValueFrom, Subscription } from "rxjs";
import { filter, first, take } from "rxjs/operators";
import { Capacitor } from "@capacitor/core";

import { GlobalStateManagementService } from "@services/global-state-management/global-state-management.service";
import { routerInitListenerService } from "@services/global-state-management/initial-url.service";
import { StoreReadinessService } from "@services/store-readiness/store-readiness.service";

// import { SubscribeAndLog } from "./shared/functions/custom-rxjs";
import { wait } from "./shared/functions/common";

@Component({
  selector: "app-root",
  templateUrl: "app.component.html",
  styleUrls: ["app.component.scss"],
})
export class AppComponent implements OnDestroy, OnInit {
  subs = new Subscription();

  get userState() {
    return firstValueFrom(this.GlobalStateManagement.userState$.pipe(first()));
  }

  constructor(
    private platform: Platform,
    // private afAuth: AngularFireAuth,
    private GlobalStateManagement: GlobalStateManagementService,
    private routerInitListener: routerInitListenerService,
    private storeReadiness: StoreReadinessService
  ) {
    this.initializeApp();
    // SubscribeAndLog(this.afAuth.authState, "authState$");
  }

  ngOnInit() {}

  async initializeApp() {
    const SplashScreenAvailable = Capacitor.isPluginAvailable("SplashScreen");
    const splashScreenShowOptions: ShowOptions = { showDuration: 20000 };
    const splashScreenHideOptions: HideOptions = {};
    console.log("initializeApp", SplashScreenAvailable);
    if (SplashScreenAvailable) await SplashScreen.show(splashScreenShowOptions);
    console.log("past show");

    this.startGlobalStateManagement();

    await this.platform.ready();
    console.log("past platform");

    if ((await this.userState) === "full") {
      console.log("past userState full");
      await this.fullIsReady();
    }

    if (SplashScreenAvailable) await SplashScreen.hide(splashScreenHideOptions);
    console.log("past hide");
  }

  startGlobalStateManagement() {
    this.subs.add(this.GlobalStateManagement.activate$.subscribe());
  }

  async fullIsReady() {
    return Promise.all([this.routeIsMain(), this.ownProfileReady()]);
  }

  async routeIsMain() {
    return firstValueFrom(
      this.GlobalStateManagement.isInMain().pipe(filter(Boolean), take(1))
    );
  }

  // Returns a promise when the stores are ready
  async ownProfileReady() {
    return firstValueFrom(
      this.storeReadiness.ownProfile$.pipe(filter((isReady) => isReady))
    );
  }

  onRouterOutletActivation() {
    this.routerInitListener.onRouterOutletActivation();
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }
}
