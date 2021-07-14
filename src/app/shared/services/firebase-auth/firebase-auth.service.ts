import { AlertController } from "@ionic/angular";
import { Injectable } from "@angular/core";
import { Router } from "@angular/router";

import { AngularFireAuth } from "@angular/fire/auth";

import { from, Observable } from "rxjs";
import { concatMap, map } from "rxjs/operators";

import firebase from "firebase";

@Injectable({
  providedIn: "root",
})
export class FirebaseAuthService {
  constructor(
    private router: Router,
    private alertCtrl: AlertController,
    private afAuth: AngularFireAuth
  ) {}

  async wrongPasswordPopup(folowUpPromise: Promise<any> | null): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: "Incorrect Password",
      backdropDismiss: false,
      message: "The password you have entered is incorrect, please try again.",
      buttons: ["OK"],
    });

    alert.onDidDismiss().then(() => {
      if (folowUpPromise) return folowUpPromise;
    });

    await alert.present();
  }

  async wrongPasswordMaxAttemptsPopup(
    followUpPromise: Promise<any> | null
  ): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: "Maximum Number of Attempts",
      backdropDismiss: false,
      message:
        "You have entered an incorrect password too many times. You will now be logged out and redirected to the welcome page.",
      buttons: ["OK"],
    });

    alert.onDidDismiss().then(() => {
      if (followUpPromise) return followUpPromise;
    });

    await alert.present();
  }

  async unknownErrorPopup(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: "Something went wrong",
      message: "An error occured. Please contact us or try again later !",
      buttons: ["OK"],
    });

    await alert.present();
  }

  async reAuthenticationProcedure(user: firebase.User): Promise<firebase.User> {
    const cancelProcedure = () =>
      this.afAuth.signOut().then(() => this.router.navigateByUrl("/welcome"));

    const OkProcedure = async (data) => {
      const credentials = firebase.auth.EmailAuthProvider.credential(
        user.email,
        data.password
      );
      try {
        await user.reauthenticateWithCredential(credentials);
      } catch (err) {
        if (err?.code === "auth/wrong-password") {
          return this.wrongPasswordPopup(this.reAuthenticationProcedure(user));
        } else if (err?.code === "auth/too-many-requests")
          return this.wrongPasswordMaxAttemptsPopup(this.afAuth.signOut());
      }
    };

    const alert = await this.alertCtrl.create({
      header: "Reauthentication required",
      backdropDismiss: false,
      message: `
      The account was signed in too long ago. Please provide a password
      to <strong>${user.email}</strong>. 
      It is recommended you do not cancel. It will sign you out and get you back 
      to the login page.
    `,
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

    return user;
  }

  async changePasswordProcedure(user: firebase.User): Promise<firebase.User> {
    let pswrd: string;
    const OkProcedure = async (data) => {
      pswrd = data.password;
      try {
        await user.updatePassword(pswrd);
      } catch (err) {
        if (err?.code === "auth/requires-recent-login") {
          return this.reAuthenticationProcedure(user)
            .then(() => user.updatePassword(pswrd))
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
}
