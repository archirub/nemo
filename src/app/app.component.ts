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
import { App } from "@capacitor/app";

import { firstValueFrom, Subscription } from "rxjs";
import { filter, first } from "rxjs/operators";
import { Capacitor } from "@capacitor/core";

import { GlobalStateManagementService } from "@services/global-state-management/global-state-management.service";
import { routerInitListenerService } from "@services/global-state-management/initial-url.service";
import { StoreReadinessService } from "@services/store-readiness/store-readiness.service";
import { GlobalErrorHandler } from "@services/errors/global-error-handler.service";
import { AngularFirestore } from "@angular/fire/firestore";
import { ChatboardPicturesStore } from "@stores/pictures/chatboard-pictures/chatboard-pictures.service";

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
    private fs: AngularFirestore,

    private chatboardPictures: ChatboardPicturesStore,
    private errorHandler: GlobalErrorHandler
  ) {
    this.initializeApp();

    // this.chatboardPictures.holder$.subscribe((a) =>
    //   console.log("chatboardPictures.holder$:", a)
    // );
  }

  ngOnInit() {
    this.afAuth.authState.subscribe((a) => console.log("change in authstate: ", a));
  }

  async initializeApp() {
    console.log("initializeApp");
    const SplashScreenAvailable = Capacitor.isPluginAvailable("SplashScreen");
    const splashScreenShowOptions: ShowOptions = { showDuration: 10000 };
    const splashScreenHideOptions: HideOptions = {};

    // this.capacitorPushNotificationStuff();

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

  capacitorPushNotificationStuff() {
    console.log("capacitorPushNotificationStuff", PushNotifications);
    // Request permission to use push notifications
    // iOS will prompt user and return if they granted permission or not
    // Android will just grant without prompting
    PushNotifications.requestPermissions().then((result) => {
      if (result.receive === "granted") {
        // Register with Apple / Google to receive push via APNS/FCM
        PushNotifications.register();
      } else {
        // Show some error
      }
    });

    // On success, we should be able to receive notifications
    PushNotifications.addListener("registration", async (token: Token) => {
      const user = await this.errorHandler.getCurrentUser();
      this.fs.collection("profiles").doc();
      console.log("Push registration success, token: " + token.value);
    });

    // Some issue with our setup and push will not work
    PushNotifications.addListener("registrationError", (error: any) => {
      console.log("Error on registration: " + JSON.stringify(error));
    });

    // Show us the notification payload if the app is open on our device
    PushNotifications.addListener(
      "pushNotificationReceived",
      (notification: PushNotificationSchema) => {
        console.log("Push received: " + JSON.stringify(notification));
      }
    );

    // Method called when tapping on a notification
    PushNotifications.addListener(
      "pushNotificationActionPerformed",
      (notification: ActionPerformed) => {
        console.log("Push action performed: " + JSON.stringify(notification));
      }
    );
  }
}
