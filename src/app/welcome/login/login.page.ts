import { NavController } from "@ionic/angular";
import { Component } from "@angular/core";
import { FormControl, FormGroup, Validators } from "@angular/forms";
import { AngularFireAuth } from "@angular/fire/auth";

import { defer, firstValueFrom } from "rxjs";
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

    try {
      await firstValueFrom(
        defer(() => this.afAuth.signInWithEmailAndPassword(email, password)).pipe(
          this.errorHandler.convertErrors("firebase-auth"),
          this.errorHandler.handleErrors({ strategy: "propagateError" })
        )
      );

      this.loginForm.get("email").patchValue("");
      this.loginForm.get("password").patchValue("");

      await this.loadingAlertManager.dismissDisplayed();

      return this.navCtrl.navigateForward("main/tabs/home");
    } catch {
      this.loginForm.get("password").patchValue("");
      return this.loadingAlertManager.dismissDisplayed();
    }
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
