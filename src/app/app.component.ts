import { Platform } from "@ionic/angular";
import { Component, OnInit, OnDestroy } from "@angular/core";

import {
  ActionPerformed,
  PushNotificationSchema,
  PushNotifications,
  Token,
} from "@capacitor/push-notifications";

import { AngularFireAuth } from "@angular/fire/auth";
import { Capacitor } from "@capacitor/core";
import { SplashScreen } from "@capacitor/splash-screen";
import { Subscription } from "rxjs";

import { GlobalStateManagementService } from "@services/global-state-management/global-state-management.service";
import { routerInitListenerService } from "@services/global-state-management/initial-url.service";
import { StoreReadinessService } from "@services/store-readiness/store-readiness.service";
import { filter, first } from "rxjs/operators";
import { NotificationsService } from "@services/notifications/notifications.service";

@Component({
  selector: "app-root",
  templateUrl: "app.component.html",
  styleUrls: ["app.component.scss"],
})
export class AppComponent implements OnDestroy, OnInit {
  subs = new Subscription();

  constructor(
    private platform: Platform,
    private afAuth: AngularFireAuth,
    private GlobalStateManagement: GlobalStateManagementService,
    private routerInitListener: routerInitListenerService, // don't remove, used in template
    private storeReadiness: StoreReadinessService,
    private notifications: NotificationsService
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
    this.subs.unsubscribe();
  }

  async initializeApp() {
    const SplashScreenAvailable = Capacitor.isPluginAvailable("SplashScreen");
    console.log("SplashScreenAvailable", SplashScreenAvailable);
    if (SplashScreenAvailable) {
      await SplashScreen.show({ autoHide: false });
    }
    await this.platform.ready();

    this.startGlobalStateManagement();
    console.log("stringified date", new Date(JSON.parse(JSON.stringify(new Date()))));

    const userStateSnapshot = await this.GlobalStateManagement.userState$
      .pipe(first())
      .toPromise();

    if (userStateSnapshot === "full") await this.storesReady();

    if (SplashScreenAvailable) {
      await SplashScreen.hide();
    }

    // this.capacitorPushNotificationStuff();
  }

  startGlobalStateManagement() {
    this.subs.add(this.GlobalStateManagement.activate().subscribe());
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

  capacitorPushNotificationStuff() {
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
    PushNotifications.addListener("registration", (token: Token) => {
      alert("Push registration success, token: " + token.value);
    });

    // Some issue with our setup and push will not work
    PushNotifications.addListener("registrationError", (error: any) => {
      alert("Error on registration: " + JSON.stringify(error));
    });

    // Show us the notification payload if the app is open on our device
    PushNotifications.addListener(
      "pushNotificationReceived",
      (notification: PushNotificationSchema) => {
        alert("Push received: " + JSON.stringify(notification));
      }
    );

    // Method called when tapping on a notification
    PushNotifications.addListener(
      "pushNotificationActionPerformed",
      (notification: ActionPerformed) => {
        alert("Push action performed: " + JSON.stringify(notification));
      }
    );
  }
}
