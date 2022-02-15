import { Injectable } from "@angular/core";
import { AngularFirestore } from "@angular/fire/firestore";

import { Capacitor } from "@capacitor/core";
import {
  ActionPerformed,
  PushNotifications,
  PushNotificationSchema,
  Token,
} from "@capacitor/push-notifications";
import { BehaviorSubject, defer, firstValueFrom, merge, Observable, of } from "rxjs";
import { distinctUntilChanged, filter, map, switchMap, take, tap } from "rxjs/operators";

import { GlobalErrorHandler } from "@services/errors/global-error-handler.service";
import { StoreResetter } from "@services/global-state-management/store-resetter.service";

import { FieldValue } from "@interfaces/firebase.model";
import { AbstractStoreService } from "@interfaces/stores.model";

@Injectable({ providedIn: "root" })
export class NotificationsStore extends AbstractStoreService {
  public isReady$: Observable<boolean> = null;

  private token = new BehaviorSubject<Token>(null);
  private token$ = this.token.asObservable().pipe(distinctUntilChanged());

  // for ugly logic for removing token on store reset (which happens after the user was logged out,
  // and for which we need the user's uid)
  private uid: string = null;

  handleStorageAddition$ = this.token$.pipe(
    filter((t) => !!t?.value),
    switchMap((t) =>
      this.errorHandler.getCurrentUser$().pipe(
        take(1),
        map((u) => [t, u] as const)
      )
    ),
    tap(([_, u]) => {
      this.uid = u.uid;
    }),
    switchMap(([token, user]) => this.updateToken(token.value, user.uid, "add"))
  );

  constructor(
    private fs: AngularFirestore,
    private errorHandler: GlobalErrorHandler,
    protected resetter: StoreResetter
  ) {
    super(resetter);
  }

  protected systemsToActivate(): Observable<any> {
    const isPushNotificationsAvailable = Capacitor.isPluginAvailable("PushNotifications");
    if (!isPushNotificationsAvailable) {
      return of("");
    }

    this.listenOnRegistration();
    return merge(this.handleStorageAddition$, this.requestPermission());
  }

  protected async resetStore(): Promise<void> {
    await firstValueFrom(this.removeFromStorage());
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
  }

  removeFromStorage() {
    return this.token$.pipe(
      take(1),
      switchMap((token) => {
        if (!token?.value || !this.uid) return of("");
        return this.updateToken(token.value, this.uid, "remove");
      })
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
