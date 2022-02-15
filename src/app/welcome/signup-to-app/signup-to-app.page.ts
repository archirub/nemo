import { NavController } from "@ionic/angular";
import { Component } from "@angular/core";
import { StoreReadinessService } from "@services/store-readiness/store-readiness.service";
import { firstValueFrom, lastValueFrom, Observable } from "rxjs";

import { exhaustMap, filter } from "rxjs/operators";
import { NotificationsStore } from "@stores/notifications/notifications.service";
import { LoadingAndAlertManager } from "@services/loader-and-alert-manager/loader-and-alert-manager.service";
import { StoreStateManager } from "@services/global-state-management/store-state-manager.service";
import { GlobalErrorHandler } from "@services/errors/global-error-handler.service";
import { AnalyticsService } from "@services/analytics/analytics.service";

@Component({
  selector: "app-signup-to-app",
  templateUrl: "./signup-to-app.page.html",
  styleUrls: ["./signup-to-app.page.scss"],
})
export class SignupToAppPage {
  get appIsReady$(): Observable<boolean> {
    return this.readiness.app$;
  }

  constructor(
    private navCtrl: NavController,

    private loadingAlertManager: LoadingAndAlertManager,
    private storeStateManager: StoreStateManager,
    private readiness: StoreReadinessService,
    private notifications: NotificationsStore,

    private errorHandler: GlobalErrorHandler,
    private fbAnalytics: AnalyticsService
  ) {}

  ngOnInit() {}

  ionViewDidEnter() {
    console.log("check for ionViewDidEnter, can log remove now.");
    this.initializeAppState();
  }

  async goToApp() {
    if (await firstValueFrom(this.appIsReady$))
      return this.navCtrl.navigateRoot("/main/tabs/home");

    const loader = await this.loadingAlertManager.createLoading({
      message: "Getting the app ready...",
    });

    loader.onDidDismiss().then(() => this.navCtrl.navigateRoot("/main/tabs/home"));

    await this.loadingAlertManager.presentNew(loader, "replace-erase");

    return this.dismissOnAppReady(() => this.loadingAlertManager.dismissDisplayed());
  }

  async dismissOnAppReady(dismissLoader: () => Promise<any>) {
    return firstValueFrom(
      this.appIsReady$.pipe(
        filter((isReady) => isReady),
        exhaustMap(() => dismissLoader())
      )
    );
  }

  toggleChange(option) {
    if (option == "on") {
      this.requestNotificationsPermission();
    }
  }

  async requestNotificationsPermission() {
    this.fbAnalytics.logEvent("request_notifs", {
      UID: (await this.errorHandler.getCurrentUser()).uid, //user uid
      timestamp: Date.now(), //Time since epoch
    });

    return lastValueFrom(this.notifications.requestPermission());
  }

  async initializeAppState() {
    // await lastValueFrom(this.globalStateManagement.resetAppState());
    this.storeStateManager.activateUserDependent();
  }
}
