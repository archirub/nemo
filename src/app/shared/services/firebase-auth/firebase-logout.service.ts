import { Injectable, NgZone } from "@angular/core";
import { NavController } from "@ionic/angular";
import { AngularFireAuth } from "@angular/fire/auth";

import { Storage } from "@capacitor/storage";

import { StoreResetter } from "@services/global-state-management/store-resetter.service";
import { LoadingAndAlertManager } from "@services/loader-and-alert-manager/loader-and-alert-manager.service";
import { BehaviorSubject } from "rxjs";
import { pageTransition } from "@animations/page-transition.animation";
import { wait } from "../../functions/common";
import { ManagementPauser } from "@services/global-state-management/management-pauser.service";

// this functionality was moved to a different service to solve some dependency issues between
// global-error-handler -> firebase-auth-service -> firebase-auth-error-handler (|| other error handlers) -> global-error-handler
// due to the use of logOut in some specific error handlers that were imported into global-error-handler
// This format allows the logOut function to be imported from a service in which globalErrorHandler.handlerErrors is not used
@Injectable({
  providedIn: "root",
})
export class FirebaseLogoutService {
  // the sole purpose of this thing is to tell the app component
  // to unsubscribe from the global state management service while logging out
  // is happening, and to wait until we have at least navigated to "welcome" page
  // to start again. Otherwise a "null" value comes in from afAuth.user in global state management
  // and it sees no one is authenticated + we are in settings page so it triggers navigation
  // back to welcome (a second time) and store reset (a second time) which is quite inefficient
  // private isLoggingOut = new BehaviorSubject<boolean>(false);
  // public isLoggingOut$ = this.isLoggingOut.asObservable();

  constructor(
    private zone: NgZone,
    private navCtrl: NavController,
    private managementPauser: ManagementPauser,

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
    const logOut = async () => {
      await this.managementPauser.requestPause("logging-out");
      return this.afAuth.signOut();
    };

    const duringLoadingPromise = () =>
      Promise.all([clearLocalCache(), this.storeResetter.resetStores(logOut)]);

    const navigateToWelcome = async () =>
      this.zone.run(() => {
        console.log("navigateToWelcome");
        return this.navCtrl.navigateForward("/welcome");
      });
    // .then(() => window.location.reload());

    const loader = await this.loadingAlertManager.createLoading();

    await this.loadingAlertManager.presentNew(loader, "replace-erase");

    await duringLoadingPromise();

    await this.loadingAlertManager.dismissDisplayed();

    await wait(100);

    await navigateToWelcome();

    return this.managementPauser.unrequestPause("logging-out");
  }
}
