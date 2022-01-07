import { NavController } from "@ionic/angular";
import { Component, OnInit } from "@angular/core";
import { GlobalStateManagementService } from "@services/global-state-management/global-state-management.service";
import { StoreReadinessService } from "@services/store-readiness/store-readiness.service";
import { firstValueFrom, lastValueFrom, Observable } from "rxjs";

import { exhaustMap, filter, first } from "rxjs/operators";
import { NotificationsService } from "@services/notifications/notifications.service";
import { LoadingAndAlertManager } from "@services/loader-and-alert-manager/loader-and-alert-manager.service";

@Component({
  selector: "app-signup-to-app",
  templateUrl: "./signup-to-app.page.html",
  styleUrls: ["./signup-to-app.page.scss"],
})
export class SignupToAppPage implements OnInit {
  get appIsReady$(): Observable<boolean> {
    return this.readiness.app$;
  }

  constructor(
    private navCtrl: NavController,

    private loadingAlertManager: LoadingAndAlertManager,
    private globalStateManagement: GlobalStateManagementService,
    private readiness: StoreReadinessService,
    private notifications: NotificationsService
  ) {}

  ngOnInit() {
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

    return this.dismissOnAppReady(this.loadingAlertManager.dismissDisplayed);
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
    if (option == 'on') {
      this.requestNotificationsPermission();
    };
  }

  async requestNotificationsPermission() {
    return lastValueFrom(this.notifications.requestPermission());
  }

  async initializeAppState() {
    await lastValueFrom(this.globalStateManagement.resetAppState());
    return lastValueFrom(this.globalStateManagement.activateAllStores());
  }
}
