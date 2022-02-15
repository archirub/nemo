import { NavController } from "@ionic/angular";
import { Component, ElementRef, ViewChild } from "@angular/core";
import { StoreReadinessService } from "@services/store-readiness/store-readiness.service";
import { firstValueFrom, lastValueFrom, Observable, ReplaySubject } from "rxjs";

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

  private videoPlayerRef$ = new ReplaySubject<ElementRef>(1);
  @ViewChild("videoPlayer", { read: ElementRef }) set videoPlayerSetter(ref: ElementRef) {
    if (ref) {
      this.videoPlayerRef$.next(ref);
    }
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

  ngOnInit() {
    this.playVideo();
  }

  ionViewWillEnter() {
    this.playVideo();
  }

  ionViewDidEnter() {
    console.log("check for ionViewDidEnter, can log remove now.");
    this.initializeAppState();
  }

  async goToApp() {
    if (await firstValueFrom(this.appIsReady$)) return this.navigateToHome();

    const loader = await this.loadingAlertManager.createLoading({
      message: "Getting the app ready...",
    });

    loader.onDidDismiss().then(() => this.navigateToHome());

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

    // activates the user-dependent stores
    this.storeStateManager.activateUserDependent();
  }

  async navigateToHome() {
    await this.pauseVideo();
    return this.navCtrl.navigateForward("/main/tabs/home");
  }

  async playVideo() {
    return firstValueFrom(this.videoPlayerRef$).then((ref) => ref.nativeElement.play());
  }

  async pauseVideo() {
    return firstValueFrom(this.videoPlayerRef$).then((ref) => ref.nativeElement.pause());
  }
}
