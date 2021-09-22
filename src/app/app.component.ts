import { Platform } from "@ionic/angular";
import { Component, OnInit, OnDestroy } from "@angular/core";

import { AngularFireAuth } from "@angular/fire/compat/auth";
import { Plugins, Capacitor } from "@capacitor/core";
import { ReplaySubject, Subscription } from "rxjs";

import { GlobalStateManagementService } from "@services/global-state-management/global-state-management.service";
import { routerInitListenerService } from "@services/global-state-management/initial-url.service";
import { ConnectionService } from "@services/connection/connection.service";
import { OtherProfilesStore, SearchCriteriaStore } from "@stores/index";

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
    private connectionService: ConnectionService,
    private otherProfileStore: OtherProfilesStore,
    private SCStore: SearchCriteriaStore
  ) {
    this.initializeApp();
  }

  ngOnInit() {
    this.afAuth.authState.subscribe((a) => console.log("change in authstate: ", a));
    this.SCStore.searchCriteria$.subscribe((a) => console.log("current SC", a));
  }

  ngOnDestroy(): void {
    this.appGlobalStateManagementSub?.unsubscribe();
  }

  async initializeApp() {
    await this.platform.ready();

    if (Capacitor.isPluginAvailable("SplashScreen")) {
      await Plugins.SplashScreen.hide();
    }

    this.appGlobalStateManagementSub = this.GlobalStateManagement.activate().subscribe();
  }

  onRouterOutletActivation() {
    this.routerInitListener.onRouterOutletActivation();
  }
}
