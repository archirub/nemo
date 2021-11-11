import { AlertController, LoadingController, NavController } from "@ionic/angular";
import { Component } from "@angular/core";
import { FormControl, FormGroup, Validators } from "@angular/forms";
import { AngularFireAuth } from "@angular/fire/auth";

import { FirebaseAuthService } from "@services/firebase-auth/firebase-auth.service";
import { LoadingService } from "@services/loading/loading.service";

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
    private afAuth: AngularFireAuth,
    private authService: FirebaseAuthService,
    private navCtrl: NavController,
    private loadingCtrl: LoadingController,
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
    try {
      await this.afAuth.signInWithEmailAndPassword(email, password);
      await loader.dismiss();
    } catch (e) {
      await loader.dismiss();
      if (e.code === "auth/wrong-password") {
        await this.authService.wrongPasswordPopup(null);
      } else if (e.code === "auth/user-not-found") {
        await this.authService.unknownUserPopup();
      } else if (e.code === "auth/user-disabled") {
        await this.authService.userDisabledPopup();
      } else if (e.code === "auth/too-many-requests") {
        await this.authService.wrongPasswordMaxAttemptsPopup(null);
      } else {
        await this.authService.unknownErrorPopup();
      }
    }
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
