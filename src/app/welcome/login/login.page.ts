import { NavController } from "@ionic/angular";
import { Component } from "@angular/core";
import { FormControl, FormGroup, Validators } from "@angular/forms";
import { AngularFireAuth } from "@angular/fire/auth";

import { defer, firstValueFrom, switchMap } from "rxjs";
import { GlobalErrorHandler } from "@services/errors/global-error-handler.service";
import { LoadingAndAlertManager } from "@services/loader-and-alert-manager/loader-and-alert-manager.service";

@Component({
  selector: "app-login",
  templateUrl: "./login.page.html",
  styleUrls: ["./login.page.scss"],
})
export class LoginPage {
  loginForm = new FormGroup({
    email: new FormControl("", [Validators.email, Validators.required]),
    password: new FormControl("", [Validators.required]),
  });

  constructor(
    private navCtrl: NavController,

    private afAuth: AngularFireAuth,

    private loadingAlertManager: LoadingAndAlertManager,
    private errorHandler: GlobalErrorHandler
  ) {}

  async onLogin() {
    if (!this.loginForm.valid) {
      return this.showAlert("Your email address or password is incorrectly formatted!");
    }

    const loader = await this.loadingAlertManager.createLoading();
    await this.loadingAlertManager.presentNew(loader, "replace-erase");

    const email: string = this.loginForm.get("email").value;
    const password: string = this.loginForm.get("password").value;

    await firstValueFrom(
      defer(() => this.afAuth.signInWithEmailAndPassword(email, password)).pipe(
        this.errorHandler.convertErrors("firebase-auth"),
        switchMap(() => defer(() => this.navCtrl.navigateForward("main/tabs/home"))),
        this.errorHandler.handleErrors()
      )
    );

    await this.loadingAlertManager.dismissDisplayed();
  }

  private async showAlert(message: string) {
    const alert = await this.loadingAlertManager.createAlert({
      header: "Signup Failed",
      message: message,
      buttons: ["Okay"],
    });

    return this.loadingAlertManager.presentNew(alert, "replace-erase");
  }

  returnToLanding() {
    this.navCtrl.navigateBack("/welcome");
  }
}
