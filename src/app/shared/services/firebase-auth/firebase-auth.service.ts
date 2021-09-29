import { EmailAuthProvider, FirebaseUser } from "@interfaces/index";
import { AlertController, NavController, LoadingController } from "@ionic/angular";
import { Injectable, NgZone } from "@angular/core";
import { Router } from "@angular/router";

import { AngularFireAuth } from "@angular/fire/auth";
import { Storage } from "@capacitor/core";

import { LoadingOptions, LoadingService } from "@services/loading/loading.service";
import { AngularFireFunctions } from "@angular/fire/functions";
import { deleteAccountRequest, successResponse } from "@interfaces/cloud-functions.model";
import { EmptyStoresService } from "@services/global-state-management/empty-stores.service";

@Injectable({
  providedIn: "root",
})
export class FirebaseAuthService {
  constructor(
    private router: Router,
    private alertCtrl: AlertController,
    private afAuth: AngularFireAuth,
    private afFunctions: AngularFireFunctions,
    private navCtrl: NavController,
    private zone: NgZone,
    private loadingService: LoadingService,
    private loadingController: LoadingController,
    private emptyStoresService: EmptyStoresService
  ) {}

  public async logOut() {
    // have to explicitely do it this way instead of using directly "this.navCtrl.navigateRoot"
    // otherwise it causes an error
    // calling ngZone.run() is necessary otherwise we will get into trouble with changeDecection
    // back at the welcome page (it seems like it's then not active), which cases problem for example
    // while trying to log back in where the "log in" button doesn't get enabled when the email-password form becomes valid
    const clearLocalCache = () => Storage.clear();
    const clearStores = async () => this.emptyStoresService.emptyStores();
    const logOut = () => this.afAuth.signOut();

    const duringLoadingPromise = () =>
      Promise.all([clearLocalCache(), clearStores()]).then(() => logOut());

    const navigateToWelcome = async () =>
      this.zone
        .run(() => this.navCtrl.navigateRoot("/welcome"))
        .then(() => window.location.reload());

    await this.loadingService.presentLoader(
      [{ promise: duringLoadingPromise, arguments: [] }],
      [{ promise: navigateToWelcome, arguments: [] }]
    );
  }

  public async deleteAccount() {
    const user = await this.afAuth.currentUser;

    if (!user) return;

    const navigateToWelcome = async () =>
      this.zone.run(() => this.navCtrl.navigateRoot("/welcome"));
    const clearLocalCache = () => Storage.clear();
    const clearStores = async () => this.emptyStoresService.emptyStores();
    const logOut = () => this.afAuth.signOut();
    const deleteAccount = () =>
      this.afFunctions
        .httpsCallable("deleteAccount")({} as deleteAccountRequest)
        .toPromise();

    const loadingOptions: LoadingOptions = {
      ...this.loadingService.defaultLoadingOptions,
      message: "Deleting account...",
    };
    const accountDeletionLoading = await this.loadingController.create(loadingOptions);

    const cancelUserConfirmationAlert = () => {};
    const confirmUserConfirmationAlert = async () => {
      const message = `Please provide a password to ${user.email}`;

      const { outcome } = await this.reAuthenticationProcedure(
        user,
        message,
        async () => {}
      );

      if (outcome !== "user-reauthenticated") return;

      await accountDeletionLoading.present();

      await Promise.all([clearLocalCache(), clearStores()]);

      const successResponse: successResponse = await deleteAccount();

      // must logout after deleteAccount, otherwise it fails (as delete account)
      // requires the user to be authenticated
      await Promise.all([logOut(), navigateToWelcome()]);

      await accountDeletionLoading.dismiss();

      if (!successResponse.successful) {
        const accountDeletionFailedPopup = await this.alertCtrl.create({
          header: "Account deletion failed",
          message: `
          An error occured while we were trying to delete your account. 
          Please either log back in and try again, or contact support for assistance.
          `,
          backdropDismiss: false,
          buttons: ["Ok"],
        });
        await accountDeletionFailedPopup.present();
      }
    };

    const userConfirmationAlert = await this.alertCtrl.create({
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

    await userConfirmationAlert.present();
  }

  public async changePasswordProcedure(): Promise<FirebaseUser> {
    const user = await this.afAuth.currentUser;

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

    const alert = await this.alertCtrl.create({
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

    await alert.present();

    return user;
  }

  public async reAuthenticationProcedure(
    user: FirebaseUser,
    message: string = null,
    cancelProcedureChosen: () => Promise<any> = null
  ): Promise<{
    user: FirebaseUser;
    outcome: "user-reauthenticated" | "user-canceled" | "auth-failed";
  }> {
    let outcome: "user-reauthenticated" | "user-canceled" | "auth-failed";

    const defaultCancelProcedure = () =>
      this.afAuth.signOut().then(() => {
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
        console.log("error is", err);
        if (err?.code === "auth/wrong-password") {
          outcome = "auth-failed";
          const nestedReauthReturn = await this.wrongPasswordPopup(() =>
            this.reAuthenticationProcedure(user, message, cancelProcedure)
          );
          // console.log("outcome", nestedReauthReturn);
          // outcome = nestedReauthReturn?.outcome;
        } else if (err?.code === "auth/too-many-requests") {
          outcome = "auth-failed";
          await this.wrongPasswordMaxAttemptsPopup(this.afAuth.signOut());
        }
      }
    };

    const alert = await this.alertCtrl.create({
      header: "Reauthentication required",
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

    await alert.present();

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
    folowUpPromise: () => Promise<T> | null
  ): Promise<T> {
    let promiseReturn: T;

    const passAlert = await this.alertCtrl.create({
      header: "Incorrect Password",
      backdropDismiss: false,
      message: "The password you have entered is incorrect, please try again.",
      buttons: ["OK"],
    });

    passAlert
      .onWillDismiss()
      .then(() => {
        if (folowUpPromise) return folowUpPromise();
      })
      .then((r) => {
        promiseReturn = r;
      });

    await passAlert.present();

    return promiseReturn;
  }

  public async wrongPasswordMaxAttemptsPopup(
    followUpPromise: Promise<any> | null
  ): Promise<void> {
    const attemptsAlert = await this.alertCtrl.create({
      header: "Maximum Number of Attempts",
      backdropDismiss: false,
      message:
        "You have entered an incorrect password too many times. The account has been temporarily disabled, please try again later.",
      buttons: ["OK"],
    });

    attemptsAlert.onDidDismiss().then(() => {
      if (followUpPromise) return followUpPromise;
    });

    await attemptsAlert.present();
  }

  public async unknownErrorPopup(message: string = null): Promise<void> {
    message =
      message ??
      "An unknown error occurred. Please check your connection, or try again later.";

    const unknownAlert = await this.alertCtrl.create({
      header: "Something went wrong",
      message,
      buttons: ["OK"],
    });

    await unknownAlert.present();
  }

  public async successPopup(message: string = null): Promise<void> {
    message = message ?? "The operation was successful!";

    const unknownAlert = await this.alertCtrl.create({
      header: "Successful Operation",
      message,
      buttons: ["OK"],
    });

    await unknownAlert.present();
  }

  public async unknownUserPopup(): Promise<void> {
    const userAlert = await this.alertCtrl.create({
      header: "User not found",
      message: "Sorry, we can't find a user for that account, please try again.",
      buttons: ["OK"],
    });

    await userAlert.present();
  }

  public async userDisabledPopup(): Promise<void> {
    const disabledAlert = await this.alertCtrl.create({
      header: "User disabled",
      message:
        "This account has been disabled. If you think this is an error, please contact support.",
      buttons: ["OK"],
    });

    await disabledAlert.present();
  }
}
