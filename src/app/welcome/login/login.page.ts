import { AlertController, LoadingController, NavController } from "@ionic/angular";
import { Component } from "@angular/core";
import { FormControl, FormGroup, Validators } from "@angular/forms";
import { AngularFireAuth } from "@angular/fire/auth";

import { FirebaseAuthService } from "@services/firebase-auth/firebase-auth.service";
import { LoadingService } from "@services/loading/loading.service";
import { defer, firstValueFrom } from "rxjs";
import { GlobalErrorHandler } from "@services/errors/global-error-handler.service";

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
    private alertCtrl: AlertController,
    private loadingCtrl: LoadingController,
    private navCtrl: NavController,

    private afAuth: AngularFireAuth,

    private errorHandler: GlobalErrorHandler,
    private loadingService: LoadingService
  ) {}

  async onLogin() {
    if (!this.loginForm.valid) {
      return this.showAlert("Your email address or password is incorrectly formatted!");
    }

    const loader = await this.loadingCtrl.create(
      this.loadingService.defaultLoadingOptions
    );
    await loader.present();

    const email: string = this.loginForm.get("email").value;
    const password: string = this.loginForm.get("password").value;

    await firstValueFrom(
      defer(() => this.afAuth.signInWithEmailAndPassword(email, password)).pipe(
        this.errorHandler.convertErrors("firebase-auth"),
        this.errorHandler.handleErrors()
      )
    );

    await loader.dismiss();
  }

  private showAlert(message: string) {
    this.alertCtrl
      .create({
        header: "Signup Failed",
        message: message,
        buttons: ["Okay"],
      })
      .then((alertEl) => alertEl.present());
  }

  returnToLanding() {
    this.navCtrl.navigateBack("/welcome");
  }
}
