import { Component, OnInit, ViewChild, ElementRef } from "@angular/core";
import { FormControl, FormGroup, Validators } from "@angular/forms";
import { Router } from "@angular/router";
import { FlyingLetterAnimation } from "@animations/letter.animation";
import { AuthResponseData } from "@interfaces/auth-response.model";
import { AlertController, IonIcon, IonSlides } from "@ionic/angular";
import { SignupService } from "@services/signup/signup.service";
import { Subscription } from "rxjs";

@Component({
  selector: "app-signupauth",
  templateUrl: "./signupauth.page.html",
  styleUrls: ["../welcome.page.scss"],
})
export class SignupauthPage implements OnInit {
  @ViewChild("slides") slides: IonSlides;
  @ViewChild("email", { read: ElementRef }) email: ElementRef;

  slidesLeft: number;
  flyingLetterAnimation;

  validatorChecks: object;

  awaitingConfirm: boolean = true;
  confirmed: boolean = false;

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
    this.flyingLetterAnimation = FlyingLetterAnimation(this.email);

    this.validatorChecks = {
      email: document.getElementById("emailCheck"),
      password: document.getElementById("passCheck"),
    };
  }

  validateAndSlide(entry) {
    /** 
     * Checks whether the field on the current slide has valid value, allows continuing if true, input
     * entry (string): the field of the form to check validator for, e.g. email, password
     * If on the final validator, password, submits form instead of sliding to next slide
     * THIS SHOULD BE USED ON THE NEXT SLIDE BUTTONS
    **/

    var validity = this.authForm.get(entry).valid; // Check validator

    if (validity === true) {
      Object.values(this.validatorChecks).forEach(element => element.style.display = "none"); // Hide all "invalid" UI

      if (entry === "password") { // If password valid, submit form
        this.onSubmit();
      } else {
        this.unlockAndSlideToNext(); // If others valid, slide next
      };

    } else {
      this.validatorChecks[entry].style.display = "flex"; // Show "invalid" UI for invalid validator
      console.log("Not valid, don't slide");
    };
  }

  async updatePager() {
    var email = document.getElementById("email");
    var hourglass = document.getElementById("hourglass");
    var pass = document.getElementById("pass");
    var tick = document.getElementById("tick");

    var map = {
      0: email,
      1: {
        'true': hourglass,
        'false': tick,
      },
      2: pass,
    };

    for (let i = 0; i < 3; i++) {
      if (i != 1) {
        map[i].style.display = "none" 
      } else {
        Object.values(map[i]).forEach((element) => element.style.display = "none");
      };
    };

    var dots: HTMLCollectionOf<any> = document.getElementsByClassName("pager-dot");
    Array.from(dots).forEach((element) => (element.style.display = "none")); //ignore this error, it works fine

    var l = await this.slides.length();
    var current = await this.slides.getActiveIndex();
    this.slidesLeft = l - current - 1;

    var slice = Array.from(dots).slice(0, this.slidesLeft);
    slice.forEach((element) => (element.style.display = "block")); //ignore this error, it works fine

    if (current != 1) {
      map[current].style.display = "block";
    } else {
      map[current][`${this.awaitingConfirm}`].style.display = "block";
    };
  }

  async unlockAndSlideToNext() {
    await this.slides.lockSwipes(false);
    await this.slides.slideNext();

    await this.updatePager();
    await this.slides.lockSwipes(true);
  }

  async unlockAndSlideToPrev() {
    await this.slides.lockSwipes(false);
    await this.slides.slidePrev();

    await this.updatePager();
    await this.slides.lockSwipes(true);
  }

  async unlockAndSlideTo(index: number) {
    await this.slides.lockSwipes(false);
    await this.slides.slideTo(index);

    await this.updatePager();
    await this.slides.lockSwipes(true);
  }

  resendConfirmation() {
    //Resend email here

    var text = document.getElementById("sentEmail");

    this.flyingLetterAnimation.play();
    setTimeout(() => {text.style.display = "block"}, 800);
    setTimeout(() => {text.style.display = "none"}, 2200);
    setTimeout(() => {
      this.awaitingConfirm = false; 
      this.confirmed = true;
      this.updatePager();
    }, 4200);
  }

  onConfirmation() {
    //Change UI by triggering this function on confirmation
    this.awaitingConfirm = false;
    this.confirmed = true;
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
