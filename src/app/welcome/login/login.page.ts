import { AlertController } from "@ionic/angular";
import { Component, ElementRef, ViewChild } from "@angular/core";
import { FormControl, FormGroup, Validators } from "@angular/forms";

import { AngularFireAuth } from "@angular/fire/auth";

import { FirebaseAuthService } from "@services/firebase-auth/firebase-auth.service";

import { FishSwimAnimation } from "@animations/index";
import { Router } from "@angular/router";

@Component({
  selector: "app-login",
  templateUrl: "./login.page.html",
  styleUrls: ["./login.page.scss"],
})
export class LoginPage {
  @ViewChild("fish", { read: ElementRef }) fish: ElementRef;
  fishSwimAnimation;

  loginForm = new FormGroup({
    email: new FormControl("", [
      Validators.email,
      Validators.required,
      // Validators.pattern("[a-zA-Z]*@[a-zA-Z]*.ac.uk"),
    ]),
    password: new FormControl("", [Validators.required]),
  });

  constructor(
    private alertCtrl: AlertController,
    private afAuth: AngularFireAuth,
    private authService: FirebaseAuthService,
    private router: Router
  ) {}

  ionViewDidEnter() {
    //Initialise animations
    this.fishSwimAnimation = FishSwimAnimation(this.fish);

    //Play animations (WILL LOOP INFINITELY)
    this.fishSwimAnimation.play();
  }

  async onSubmit() {
    if (!this.loginForm.valid) {
      return this.showAlert("Your email address or password is incorrectly formatted!");
    }

    const email: string = this.loginForm.get("email").value;
    const password: string = this.loginForm.get("password").value;
    try {
      await this.afAuth.signInWithEmailAndPassword(email, password);
    } catch (e) {
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

  async enterSubmit(event) {
    if (event.keyCode === 13) {
      await this.onSubmit();
    }
  }

  ionViewWillLeave() {
    this.fishSwimAnimation.pause();
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
    this.router.navigateByUrl("/welcome");
  }
}
