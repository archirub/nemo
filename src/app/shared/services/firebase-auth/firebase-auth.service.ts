import { Injectable, NgZone } from "@angular/core";
import { LoadingOptions, NavController } from "@ionic/angular";
import { Router } from "@angular/router";
import { AngularFireFunctions } from "@angular/fire/functions";
import { AngularFireAuth } from "@angular/fire/auth";

import { Storage } from "@capacitor/storage";
import { firstValueFrom } from "rxjs";

import { StoreResetter } from "@services/global-state-management/store-resetter.service";
// import { LoadingOptions, LoadingService } from "@services/loading/loading.service";

import { deleteAccountRequest } from "@interfaces/cloud-functions.model";
import { EmailAuthProvider, FirebaseUser } from "@interfaces/firebase.model";
import { FirebaseLogoutService } from "./firebase-logout.service";
import { LoadingAndAlertManager } from "@services/loader-and-alert-manager/loader-and-alert-manager.service";
import { CloudFunctionsErrorHandler } from "@services/errors/cloud-functions-error-handler.service";
import { LocalErrorHandler } from "@services/errors/local-error-handler.service";

@Injectable({
  providedIn: "root",
})
export class FirebaseAuthService {
  constructor(
    private router: Router,
    private zone: NgZone,
    private navCtrl: NavController,

    private afAuth: AngularFireAuth,
    private afFunctions: AngularFireFunctions,

    private loadingAlertManager: LoadingAndAlertManager,
    private firebaseLogout: FirebaseLogoutService,
    private localEH: LocalErrorHandler, // importing the local one directly to avoid circular dependency
    private cfEH: CloudFunctionsErrorHandler, // importing the cf one directly to avoid circular dependency
    private storeResetter: StoreResetter
  ) {}

  // lazy, could just import firebaseLogoutService whenever logout is needed instead of redirecting
  public async logOut() {
    return this.firebaseLogout.logOut();
  }

  // entire account deletion procedure
  public async deleteAccount() {
    const user = await this.localEH.getCurrentUser();

    if (!user) return;

    const navigateToWelcome = async () =>
      this.zone.run(() => this.navCtrl.navigateForward("/welcome"));
    const clearLocalCache = () => Storage.clear();
    const logOut = () => this.afAuth.signOut();
    const deleteAccount = () =>
      firstValueFrom(
        this.afFunctions
          .httpsCallable("deleteAccount")({} as deleteAccountRequest)
          .pipe(this.cfEH.errorConverter(), this.cfEH.handleErrors())
      );

    const loadingOptions: LoadingOptions = {
      message: "Deleting account...",
    };
    const accountDeletionLoading = await this.loadingAlertManager.createLoading(
      loadingOptions
    );

    const cancelUserConfirmationAlert = () => {};
    const confirmUserConfirmationAlert = async () => {
      const message = `Please provide a password to ${user.email}`;
      const { outcome } = await this.reAuthenticationProcedure(
        user,
        message,
        async () => {}
      );

      if (outcome !== "user-reauthenticated")
        return this.loadingAlertManager.dismissDisplayed();

      await this.loadingAlertManager.presentNew(accountDeletionLoading, "replace-erase");

      const accountDeletionFailedPopup = await this.loadingAlertManager.createAlert({
        header: "Account deletion failed",
        message: `
        An error occurred while we were trying to delete your account. 
        Please either log back in and try again, or contact support for assistance.
        `,
        backdropDismiss: false,
        buttons: ["Ok"],
      });

      try {
        await deleteAccount();
      } catch (e) {
        await Promise.all([
          clearLocalCache(),
          this.storeResetter.resetStores(() => logOut()),
          navigateToWelcome(),
        ]);

        return this.loadingAlertManager.presentNew(
          accountDeletionFailedPopup,
          "replace-erase"
        );
      }

      // must logout after deleteAccount, otherwise it fails (as delete account)
      // requires the user to be authenticated

      await Promise.all([
        clearLocalCache(),
        this.storeResetter.resetStores(() => logOut()),
        navigateToWelcome(),
      ]);
      return this.loadingAlertManager.dismissDisplayed();
    };

    const userConfirmationAlert = await this.loadingAlertManager.createAlert({
      header: "Are you sure you'd like to permanently delete your account?",
      backdropDismiss: false,
      message: `
      <strong>This action is irreversible.</strong>
      We will delete all traces of your time on Nemo, including your matches, chats, profile and email address.
      We will first need you the reauthenticate to confirm your identity.
    `,
      buttons: [
        {
          text: "Cancel",
          role: "cancel",
          handler: cancelUserConfirmationAlert,
        },
        {
          text: "Confirm",
          handler: confirmUserConfirmationAlert,
        },
      ],
    });

    return this.loadingAlertManager.presentNew(userConfirmationAlert, "replace-erase");
  }

  public async changePasswordProcedure(): Promise<FirebaseUser> {
    const user = await this.localEH.getCurrentUser();

    if (!user) return;

    let pswrd: string;
    const OkProcedure = async (data) => {
      pswrd = data.password;
      try {
        await user.updatePassword(pswrd);
        await this.successPopup("Your password was successfully updated.");
      } catch (err) {
        if (err?.code === "auth/requires-recent-login") {
          return this.reAuthenticationProcedure(user)
            .then(() => user.updatePassword(pswrd))
            .then(() => this.successPopup("Your password was successfully updated."))
            .catch(() => this.unknownErrorPopup());
        } else {
          return this.unknownErrorPopup();
        }
      }
    };

    const alert = await this.loadingAlertManager.createAlert({
      header: "Password Modification",
      backdropDismiss: false,
      message: "Enter a new password below",
      inputs: [{ name: "password", type: "password" }],
      buttons: [
        {
          text: "Cancel",
          role: "cancel",
        },
        {
          text: "OK",
          handler: OkProcedure,
        },
      ],
    });

    await this.loadingAlertManager.presentNew(alert, "replace-erase");

    return user;
  }

  public async reAuthenticationProcedure(
    user: FirebaseUser = null,
    message: string = null,
    cancelProcedureChosen: () => Promise<any> = null
  ): Promise<{
    user: FirebaseUser;
    outcome: "user-reauthenticated" | "user-canceled" | "auth-failed";
  }> {
    if (!user) user = await this.localEH.getCurrentUser();

    let outcome: "user-reauthenticated" | "user-canceled" | "auth-failed";

    const defaultCancelProcedure = () =>
      this.firebaseLogout.logOut().then(() => {
        return this.router.navigateByUrl("/welcome");
      });

    const cancelProcedure = () => {
      outcome = "auth-failed";
      return cancelProcedureChosen ? cancelProcedureChosen() : defaultCancelProcedure();
    };

    message =
      message ??
      `
      The account was signed in too long ago. Please provide a password
      to <strong>${user.email}</strong>. 
      It is recommended you do not cancel. It will sign you out and get you back 
      to the login page.
    `;

    const OkProcedure = async (data) => {
      const credentials = EmailAuthProvider.credential(user.email, data.password);
      try {
        await user.reauthenticateWithCredential(credentials);
        outcome = "user-reauthenticated";
      } catch (err) {
        if (err?.code === "auth/wrong-password") {
          outcome = "auth-failed";
          const nestedReauthReturn = await this.wrongPasswordPopup(() =>
            this.reAuthenticationProcedure(user, message, cancelProcedure)
          );
          // outcome = nestedReauthReturn?.outcome;
        } else if (err?.code === "auth/too-many-requests") {
          outcome = "auth-failed";
          await this.wrongPasswordMaxAttemptsPopup(this.firebaseLogout.logOut);
        }
      }
    };

    const alert = await this.loadingAlertManager.createAlert({
      header: "Re-authentication required",
      backdropDismiss: false,
      message,
      inputs: [{ name: "password", type: "password" }],
      buttons: [
        {
          text: "Cancel",
          role: "cancel",
          handler: cancelProcedure,
        },
        {
          text: "OK",
          handler: OkProcedure,
        },
      ],
    });

    await this.loadingAlertManager.presentNew(alert, "replace-erase");

    // format used to make sure function waits for outcome to have a value
    // before returning, otherwise the functions of the OkProcedure don't have
    // time to complete and outcome is just undefined
    return new Promise((resolve) => {
      const interval = setInterval(() => {
        if (outcome) {
          clearInterval(interval);
          resolve({ user, outcome });
        }
      }, 250);
    });
  }

  // returns whatever the followUpPromise returns so that it can be chained easily
  public async wrongPasswordPopup<T>(
    followUpPromise: () => Promise<T> | null
  ): Promise<T> {
    let promiseReturn: T;

    const passAlert = await this.loadingAlertManager.createAlert({
      header: "Incorrect Password",
      backdropDismiss: false,
      message: "The password you have entered is incorrect, please try again.",
      buttons: ["OK"],
    });

    passAlert
      .onWillDismiss()
      .then(() => {
        if (followUpPromise) return followUpPromise();
      })
      .then((r) => {
        promiseReturn = r;
      });

    await this.loadingAlertManager.presentNew(passAlert, "replace-erase");

    return promiseReturn;
  }

  public async wrongPasswordMaxAttemptsPopup(
    followUpPromise: () => Promise<any> | null
  ): Promise<void> {
    const attemptsAlert = await this.loadingAlertManager.createAlert({
      header: "Maximum Number of Attempts",
      backdropDismiss: false,
      message:
        "You have entered an incorrect password too many times. The account has been temporarily disabled, please try again later.",
      buttons: ["OK"],
    });

    attemptsAlert.onDidDismiss().then(() => {
      if (followUpPromise) return followUpPromise();
    });

    await this.loadingAlertManager.presentNew(attemptsAlert, "replace-erase");
  }

  public async unknownErrorPopup(message: string = null): Promise<void> {
    message =
      message ??
      "An unknown error occurred. Please check your connection, or try again later.";

    const unknownAlert = await this.loadingAlertManager.createAlert({
      header: "Something went wrong",
      message,
      buttons: ["OK"],
    });

    await this.loadingAlertManager.presentNew(unknownAlert, "replace-erase");
  }

  public async successPopup(message: string = null): Promise<void> {
    message = message ?? "The operation was successful!";

    const unknownAlert = await this.loadingAlertManager.createAlert({
      header: "Successful Operation",
      message,
      buttons: ["OK"],
    });

    await this.loadingAlertManager.presentNew(unknownAlert, "replace-erase");
  }

  public async unknownUserPopup(): Promise<void> {
    const userAlert = await this.loadingAlertManager.createAlert({
      header: "User not found",
      message: "Sorry, we can't find a user for that account, please try again.",
      buttons: ["OK"],
    });

    await this.loadingAlertManager.presentNew(userAlert, "replace-erase");
  }

  public async userDisabledPopup(): Promise<void> {
    const disabledAlert = await this.loadingAlertManager.createAlert({
      header: "User disabled",
      message:
        "This account has been disabled. If you think this is an error, please contact support.",
      buttons: ["OK"],
    });

    await this.loadingAlertManager.presentNew(disabledAlert, "replace-erase");
  }
}
