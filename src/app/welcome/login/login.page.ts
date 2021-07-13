import { AlertController } from "@ionic/angular";
import { Component, ElementRef, ViewChild } from "@angular/core";
import { FormControl, FormGroup, Validators } from "@angular/forms";

import { AngularFireAuth } from "@angular/fire/auth";

import { FishSwimAnimation } from "@animations/index";

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

  constructor(private alertCtrl: AlertController, private afAuth: AngularFireAuth) {}

  ionViewDidEnter() {
    //Initialise animations
    this.fishSwimAnimation = FishSwimAnimation(this.fish);

    //Play animations (WILL LOOP INFINITELY)
    this.fishSwimAnimation.play();
  }

  onSubmit() {
    if (!this.loginForm.valid) {
      return this.showAlert("Your email address or password is incorrectly formatted!");
    }

    const email: string = this.loginForm.get("email").value;
    const password: string = this.loginForm.get("password").value;

    this.afAuth.signInWithEmailAndPassword(email, password);
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
}
