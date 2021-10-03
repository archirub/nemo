import { Injectable } from "@angular/core";
import { PushNotifications, PermissionStatus } from "@capacitor/push-notifications";
import { BehaviorSubject, from, of } from "rxjs";
import { map, switchMap } from "rxjs/operators";

@Injectable({ providedIn: "root" })
export class NotificationsService {
  private permissionState = new BehaviorSubject<PermissionStatus["receive"]>(null);
  private permissionState$ = this.permissionState.asObservable();

  constructor() {}

  activate() {
    return this.permissionState$.pipe(
      switchMap((state) => {
        if (state === null) return this.getPermissionState();
        if (state === "prompt" || state === "prompt-with-rationale")
          return this.requestPermission();
        if (state === "granted") return this.startHandling();
        return of("");
      })
    );
  }

  requestPermission() {
    return from(PushNotifications.requestPermissions()).pipe(
      map((permissions) => this.permissionState.next(permissions.receive))
    );
  }

  getPermissionState() {
    return from(PushNotifications.checkPermissions()).pipe(
      map((permissions) => this.permissionState.next(permissions.receive))
    );
  }

  async startHandling() {}
}
