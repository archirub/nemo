import { Component, OnInit, ViewChild } from "@angular/core";
import { FormControl, FormGroup, Validators } from "@angular/forms";
import { Router } from "@angular/router";
import { AuthResponseData } from "@interfaces/auth-response.model";
import { AlertController, IonSlides } from "@ionic/angular";
import { SignupService } from "@services/signup/signup.service";
import { Subscription } from "rxjs";

@Component({
  selector: "app-signupauth",
  templateUrl: "./signupauth.page.html",
  styleUrls: ["../welcome.page.scss"],
})
export class SignupauthPage implements OnInit {
  @ViewChild("slides") slides: IonSlides;

  slidesLeft: number;

  authForm = new FormGroup({
    email: new FormControl("", [
      Validators.required,
      Validators.email,
      Validators.pattern("[a-zA-Z]*@[a-zA-Z]*.ac.uk"),
    ]),
    password: new FormControl("", [Validators.required, Validators.min(8)]),
  });

  signup$: Subscription;

  constructor(
    private alertCtrl: AlertController,
    private router: Router,
    private signup: SignupService
  ) {}

  ngOnInit() {}

  ionViewDidEnter() {
    this.slides.lockSwipes(true);
    this.updatePager();
  }

  async updatePager() {
    var email = document.getElementById("email");
    var pass = document.getElementById("pass");

    var map = {
      0: email,
      1: pass,
    };

    Object.values(map).forEach((element) => (element.style.display = "none"));

    var dots: HTMLCollectionOf<any> = document.getElementsByClassName("pager-dot");
    Array.from(dots).forEach((element) => (element.style.display = "none")); //ignore this error, it works fine

    var l = await this.slides.length();
    var current = await this.slides.getActiveIndex();
    this.slidesLeft = l - current - 1;

    var slice = Array.from(dots).slice(0, this.slidesLeft);
    slice.forEach((element) => (element.style.display = "block")); //ignore this error, it works fine

    map[current].style.display = "block";
  }

  async unlockAndSwipe() {
    this.slides.lockSwipes(false);

    this.slides.slideNext();

    this.updatePager();

    this.slides.lockSwipes(true);
  }

  onSubmit() {
    if (!this.authForm.valid) {
      return console.error("Invalid form");
    }
    const email: string = this.authForm.get("email").value;
    const password: string = this.authForm.get("password").value;

    this.signup$ = this.signup.createFirebaseAccount(email, password).subscribe(
      () => {
        this.router.navigateByUrl("welcome/signuprequired");
      },
      (errRes) => {
        console.log(errRes);
        const code = errRes.error.error.message;
        let message = "Could not sign you up. Please try again.";
        if (code === "EMAIL_EXISTS") {
          let message = "The email address is already in use by another account.";
        }
        if (code === "TOO_MANY_ATTEMPTS_TRY_LATER") {
          let message =
            "We have blocked all requests from this device due to unusual activity. Try again later.";
        }
        this.showAlert(message);
      }
    );
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

  ngOnDestroy() {
    this.signup$.unsubscribe();
  }
}
