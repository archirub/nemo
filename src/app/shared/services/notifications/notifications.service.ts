import { Injectable } from "@angular/core";
import { AngularFireAuth } from "@angular/fire/auth";
import { AngularFirestore } from "@angular/fire/firestore";

import { Capacitor } from "@capacitor/core";
import {
  ActionPerformed,
  PermissionStatus,
  PushNotifications,
  PushNotificationSchema,
  Token,
} from "@capacitor/push-notifications";
import { BehaviorSubject, defer, EMPTY, merge } from "rxjs";
import {
  distinctUntilChanged,
  filter,
  switchMap,
  tap,
  withLatestFrom,
} from "rxjs/operators";

import { GlobalErrorHandler } from "@services/errors/global-error-handler.service";

import { CustomError } from "@interfaces/error-handling.model";
import { FieldValue } from "@interfaces/firebase.model";

@Injectable({ providedIn: "root" })
export class NotificationsService {
  private permissionState = new BehaviorSubject<PermissionStatus["receive"]>(null);
  private permissionState$ = this.permissionState.asObservable();

  private token = new BehaviorSubject<Token>(null);
  private token$ = this.token.asObservable().pipe(distinctUntilChanged());

  constructor(
    private afAuth: AngularFireAuth,
    private fs: AngularFirestore,
    private errorHandler: GlobalErrorHandler
  ) {}

  activate() {
    const isPushNotificationsAvailable = Capacitor.isPluginAvailable("PushNotifications");
    if (!isPushNotificationsAvailable) {
      return EMPTY;
    }

    this.listenOnRegistration();
    return merge(
      this.handleTokenStorage(),
      this.requestPermission() // TODO - this is just for development. When to request for notifications
      // will need to be better placed, based on whether the user is going through the sign in process, etc.
    );
  }

  requestPermission() {
    return defer(() =>
      PushNotifications.requestPermissions().then((result) => {
        if (result.receive === "granted") {
          // Register with Apple / Google to receive push via APNS/FCM
          PushNotifications.register();
        } else {
          // Show some error
        }
      })
    );
  }

  private listenOnRegistration() {
    // On success, we should be able to receive notifications
    PushNotifications.addListener("registration", (token: Token) =>
      this.token.next(token)
    );

    // Some issue with our setup and push will not work
    PushNotifications.addListener("registrationError", (error: any) => {
      console.log("Error on registration: " + JSON.stringify(error));
    });

    //DEV

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

  private handleTokenStorage() {
    return this.token$.pipe(
      filter((t) => !!t?.value),
      withLatestFrom(
        this.afAuth.user.pipe(
          tap((u) => {
            if (!u) throw new CustomError("local/check-auth-state", "local");
          })
        )
      ),
      switchMap(([token, user]) =>
        this.fs
          .collection("profiles")
          .doc(user.uid)
          .collection("private")
          .doc("notifications")
          .set({ tokens: FieldValue.arrayUnion(token.value) })
      ),
      this.errorHandler.handleErrors()
    );
  }
}
