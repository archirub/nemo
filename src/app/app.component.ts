import { Platform } from "@ionic/angular";
import { Component, OnInit, OnDestroy } from "@angular/core";
import { AngularFireAuth } from "@angular/fire/auth";

import { HideOptions, ShowOptions, SplashScreen } from "@capacitor/splash-screen";
import {
  ActionPerformed,
  PushNotificationSchema,
  PushNotifications,
  Token,
} from "@capacitor/push-notifications";

import { firstValueFrom, Subscription } from "rxjs";
import { filter, first } from "rxjs/operators";
import { Capacitor } from "@capacitor/core";

import { GlobalStateManagementService } from "@services/global-state-management/global-state-management.service";
import { routerInitListenerService } from "@services/global-state-management/initial-url.service";
import { StoreReadinessService } from "@services/store-readiness/store-readiness.service";
import { ErrorHandler } from "@services/errors/error-handler.service";

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
    private afAuth: AngularFireAuth,
    private GlobalStateManagement: GlobalStateManagementService,
    private routerInitListener: routerInitListenerService,
    private storeReadiness: StoreReadinessService,
    private errorHandler: ErrorHandler
  ) {
    this.initializeApp();
  }

  ngOnInit() {
    this.afAuth.authState.subscribe((a) => console.log("change in authstate: ", a));
  }

  async initializeApp() {
    const SplashScreenAvailable = Capacitor.isPluginAvailable("SplashScreen");
    const splashScreenShowOptions: ShowOptions = { showDuration: 10000 };
    const splashScreenHideOptions: HideOptions = {};

    if (SplashScreenAvailable) await SplashScreen.show(splashScreenShowOptions);

    this.startGlobalStateManagement();

    await this.platform.ready();

    if ((await this.userState) === "full") await this.storesReady();

    if (SplashScreenAvailable) await SplashScreen.hide(splashScreenHideOptions);
  }

  startGlobalStateManagement() {
    this.subs.add(this.GlobalStateManagement.activate$.subscribe());
  }

  // Returns a promise when the stores are ready
  storesReady() {
    return firstValueFrom(this.storeReadiness.app$.pipe(filter((isReady) => isReady)));
  }

  onRouterOutletActivation() {
    this.routerInitListener.onRouterOutletActivation();
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  // capacitorPushNotificationStuff() {
  //   // Request permission to use push notifications
  //   // iOS will prompt user and return if they granted permission or not
  //   // Android will just grant without prompting
  //   PushNotifications.requestPermissions().then((result) => {
  //     if (result.receive === "granted") {
  //       // Register with Apple / Google to receive push via APNS/FCM
  //       PushNotifications.register();
  //     } else {
  //       // Show some error
  //     }
  //   });

  //   // On success, we should be able to receive notifications
  //   PushNotifications.addListener("registration", (token: Token) => {
  //     alert("Push registration success, token: " + token.value);
  //   });

  //   // Some issue with our setup and push will not work
  //   PushNotifications.addListener("registrationError", (error: any) => {
  //     alert("Error on registration: " + JSON.stringify(error));
  //   });

  //   // Show us the notification payload if the app is open on our device
  //   PushNotifications.addListener(
  //     "pushNotificationReceived",
  //     (notification: PushNotificationSchema) => {
  //       alert("Push received: " + JSON.stringify(notification));
  //     }
  //   );

  //   // Method called when tapping on a notification
  //   PushNotifications.addListener(
  //     "pushNotificationActionPerformed",
  //     (notification: ActionPerformed) => {
  //       alert("Push action performed: " + JSON.stringify(notification));
  //     }
  //   );
  // }
}
