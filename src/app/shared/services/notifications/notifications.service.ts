import { Injectable } from "@angular/core";
import { AngularFirestore } from "@angular/fire/firestore";

import { Capacitor } from "@capacitor/core";
import {
  ActionPerformed,
  PushNotifications,
  PushNotificationSchema,
  Token,
} from "@capacitor/push-notifications";
import { BehaviorSubject, defer, EMPTY, firstValueFrom, merge, Observable } from "rxjs";
import { distinctUntilChanged, filter, switchMap, withLatestFrom } from "rxjs/operators";

import { GlobalErrorHandler } from "@services/errors/global-error-handler.service";
import { StoreResetter } from "@services/global-state-management/store-resetter.service";

import { FieldValue } from "@interfaces/firebase.model";
import { AbstractStoreService } from "@interfaces/stores.model";

@Injectable({ providedIn: "root" })
export class NotificationsService extends AbstractStoreService {
  public isReady$: Observable<boolean> = null;

  private token = new BehaviorSubject<Token>(null);
  private token$ = this.token.asObservable().pipe(distinctUntilChanged());

  constructor(
    private fs: AngularFirestore,
    private errorHandler: GlobalErrorHandler,
    resetter: StoreResetter
  ) {
    super(resetter);
  }

  protected systemsToActivate(): Observable<any> {
    const isPushNotificationsAvailable = Capacitor.isPluginAvailable("PushNotifications");
    if (!isPushNotificationsAvailable) {
      return EMPTY;
    }

    this.listenOnRegistration();
    return merge(this.handleTokenStorage("add"), this.requestPermission());
  }

  protected async resetStore(): Promise<void> {
    await firstValueFrom(this.handleTokenStorage("remove"));
    this.token.next(null);
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

  private handleTokenStorage(action: "add" | "remove") {
    return this.token$.pipe(
      filter((t) => !!t?.value),
      withLatestFrom(this.errorHandler.getCurrentUser$()),
      switchMap(([token, user]) => this.updateToken(token.value, user.uid, action))
    );
  }

  private updateToken(tokenValue: string, uid: string, action: "add" | "remove") {
    const fieldValueAction =
      action === "add"
        ? FieldValue.arrayUnion(tokenValue)
        : FieldValue.arrayRemove(tokenValue);

    return defer(() =>
      this.fs
        .collection("profiles")
        .doc(uid)
        .collection("private")
        .doc("notifications")
        .set({ tokens: fieldValueAction })
    ).pipe(
      this.errorHandler.convertErrors("firestore"),
      this.errorHandler.handleErrors()
    );
  }
}
