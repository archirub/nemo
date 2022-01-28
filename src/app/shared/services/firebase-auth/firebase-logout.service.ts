import { Injectable, NgZone } from "@angular/core";
import { NavController } from "@ionic/angular";
import { AngularFireAuth } from "@angular/fire/auth";

import { Storage } from "@capacitor/storage";

import { StoreResetter } from "@services/global-state-management/store-resetter.service";
import { LoadingAndAlertManager } from "@services/loader-and-alert-manager/loader-and-alert-manager.service";

// this functionality was moved to a different service to solve some dependency issues between
// global-error-handler -> firebase-auth-service -> firebase-auth-error-handler (|| other error handlers) -> global-error-handler
// due to the use of logOut in some specific error handlers that were imported into global-error-handler
// This format allows the logOut function to be imported from a service in which globalErrorHandler.handlerErrors is not used
@Injectable({
  providedIn: "root",
})
export class FirebaseLogoutService {
  constructor(
    private zone: NgZone,
    private navCtrl: NavController,

    private afAuth: AngularFireAuth,

    private loadingAlertManager: LoadingAndAlertManager,
    private storeResetter: StoreResetter
  ) {}

  public async logOut() {
    // have to explicitly do it this way instead of using directly "this.navCtrl.navigateRoot"
    // otherwise it causes an error
    // calling ngZone.run() is necessary otherwise we will get into trouble with changeDetection
    // back at the welcome page (it seems like it's then not active), which cases problem for example
    // while trying to log back in where the "log in" button doesn't get enabled when the email-password form becomes valid
    const clearLocalCache = () => Storage.clear();
    const clearStores = async () => this.storeResetter.resetStores();
    const logOut = () => this.afAuth.signOut();

    const duringLoadingPromise = () =>
      Promise.all([clearLocalCache(), clearStores()]).then(() => logOut());

    const navigateToWelcome = async () =>
      this.zone.run(() => this.navCtrl.navigateRoot("/welcome"));
    // .then(() => window.location.reload());

    const loader = await this.loadingAlertManager.createLoading();

    await duringLoadingPromise();

    await this.loadingAlertManager.dismissDisplayed();

    return navigateToWelcome();
  }
}
