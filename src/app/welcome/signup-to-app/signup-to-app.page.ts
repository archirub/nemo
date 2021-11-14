import { LoadingController, NavController } from "@ionic/angular";
import { Component, OnInit } from "@angular/core";
import { GlobalStateManagementService } from "@services/global-state-management/global-state-management.service";
import { StoreReadinessService } from "@services/store-readiness/store-readiness.service";
import { firstValueFrom, lastValueFrom, Observable } from "rxjs";
import { LoadingService } from "@services/loading/loading.service";
import { exhaustMap, filter, first } from "rxjs/operators";
import { NotificationsService } from "@services/notifications/notifications.service";

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
    private globalStateManagement: GlobalStateManagementService,
    private readiness: StoreReadinessService,
    private loadingCtrl: LoadingController,
    private loading: LoadingService,
    private notifications: NotificationsService
  ) {}

  ngOnInit() {
    this.initializeAppState();
  }

  async goToApp() {
    if (await firstValueFrom(this.appIsReady$))
      return this.navCtrl.navigateRoot("/main/tabs/home");

    const loader = await this.loadingCtrl.create({
      ...this.loading.defaultLoadingOptions,
      message: "Getting the app ready...",
    });

    loader.onDidDismiss().then(() => this.navCtrl.navigateRoot("/main/tabs/home"));

    await loader.present();

    return this.dismissOnAppReady(loader);
  }

  async dismissOnAppReady(loader: HTMLIonLoadingElement) {
    return firstValueFrom(
      this.appIsReady$.pipe(
        filter((isReady) => isReady),
        exhaustMap(() => loader.dismiss())
      )
    );
  }

  async requestNotificationsPermission() {
    return lastValueFrom(this.notifications.requestPermission());
  }

  async initializeAppState() {
    await lastValueFrom(this.globalStateManagement.resetAppState());
    return lastValueFrom(this.globalStateManagement.activateAllStores());
  }
}
