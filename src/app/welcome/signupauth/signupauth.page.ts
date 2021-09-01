import { Component, OnInit, ViewChild, ElementRef } from "@angular/core";
import { AngularFireAuth } from "@angular/fire/auth";
import { FormBuilder, FormControl, FormGroup, Validators } from "@angular/forms";
import { Router } from "@angular/router";
import { FlyingLetterAnimation } from "@animations/letter.animation";
import { AuthResponseData } from "@interfaces/auth-response.model";
import { AlertController, IonIcon, IonSlides } from "@ionic/angular";
import { SignupService } from "@services/signup/signup.service";
import { BehaviorSubject, concat, from, Observable, of, Subscription, timer } from "rxjs";
import {
  auditTime,
  catchError,
  distinctUntilChanged,
  exhaustMap,
  filter,
  map,
  switchMap,
  take,
  takeUntil,
  tap,
} from "rxjs/operators";

type EmailVerificationState = "not-sent" | "sent" | "resent" | "verified";
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

  private emailVerificationState = new BehaviorSubject<EmailVerificationState>(
    "not-sent"
  );
  public emailVerificationState$ = this.emailVerificationState.asObservable().pipe(
    distinctUntilChanged((prev, curr) => {
      // since there can be multiple resend of the email verification, we don't want to filter these out
      if (prev === "resent" && curr === "resent") return false;
      // however, any repeating "sent", "verified" or "not-sent" in a row will be filtered out
      else return prev === curr;
    })
  );

  // has shape of a getter (more generally of a function) to get a different object ref everytime
  get emptyAuthForm() {
    return new FormGroup({
      email: new FormControl("", [
        Validators.required,
        Validators.email,
        Validators.pattern("[a-zA-Z]*@[a-zA-Z]*.ac.uk"),
      ]),
      password: new FormControl("", [Validators.required, Validators.min(8)]),
    });
  }

  authForm: FormGroup;

  signupSub: Subscription;

  constructor(
    private alertCtrl: AlertController,
    private router: Router,
    private signup: SignupService,
    private afAuth: AngularFireAuth,
    private formBuilder: FormBuilder
  ) {
    this.authForm = this.emptyAuthForm;
  }

  ngOnInit() {
    this.emailVerificationState$.subscribe((a) =>
      console.log("email verification state:", a)
    );
  }

  ionViewDidEnter() {
    this.slides.lockSwipes(true);
    this.updatePager();
    this.flyingLetterAnimation = FlyingLetterAnimation(this.email);

    this.validatorChecks = {
      email: document.getElementById("emailCheck"),
      password: document.getElementById("passCheck"),
    };
  }

  public async onSubmitAuthData(): Promise<void> {
    await this.requestAccountCreation()
      .pipe(
        filter((val) => !!val),
        switchMap(() =>
          concat(
            this.unlockAndSlideTo(1),
            this.sendEmailVerification("sent"),
            this.listenToEmailVerification()
          )
        )
      )
      .toPromise();
  }

  public async resendEmailVerification() {
    return this.sendEmailVerification("resent").toPromise();
  }

  /**
   * Checks whether the field on the current slide has valid value, allows continuing if true, input
   * entry (string): the field of the form to check validator for, e.g. email, password
   * If on the final validator, password, submits form instead of sliding to next slide
   * THIS SHOULD BE USED ON THE NEXT SLIDE BUTTONS
   **/
  // validateAndSlide(entry) {
  //   var validity = this.authForm.get(entry).valid; // Check validator

  //   if (validity === true) {
  //     Object.values(this.validatorChecks).forEach(
  //       (element) => (element.style.display = "none")
  //     ); // Hide all "invalid" UI

  //     if (entry === "password") {
  //       // If password valid, submit form
  //       this.requestAccountCreation();
  //     } else {
  //       this.unlockAndSlideToNext(); // If others valid, slide next
  //     }
  //   } else {
  //     this.validatorChecks[entry].style.display = "flex"; // Show "invalid" UI for invalid validator
  //     console.log("Not valid, don't slide");
  //   }
  // }

  async updatePager() {
    var email = document.getElementById("email");
    var hourglass = document.getElementById("hourglass");
    var pass = document.getElementById("pass");
    var tick = document.getElementById("tick");

    var map = {
      0: email,
      1: {
        true: hourglass,
        false: tick,
      },
      2: pass,
    };

    for (let i = 0; i < 3; i++) {
      if (i != 1) {
        map[i].style.display = "none";
      } else {
        Object.values(map[i]).forEach((element) => (element.style.display = "none"));
      }
    }

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
    }
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

  // 1. Start with we sent you an email verification
  // Have a button that allows to resend the email after 20 seconds of wait (count down visible and
  // then possibility to click)
  // 2. Watch for email verification, once it has been verified change UI to "email successfully verified"
  // and display a button that allows the user to continue the process (go to next slide)
  // Double check in the ts file that the email has actually been verified before allowing for navigation

  //

  // - Check that email has been verified systematically before allowing the user to
  // redirect to further parts of the signup process
  // - Put an expiry time on the account, so that it deletes if the email hasn't been verified
  // after x amount of time

  // In global state management - check if user is authed, then check if user has email verified, if
  // no then go to verification page, if yes then check whether the user has documents, handle cases
  // where document hasn't actually been fetched (like slow connection or no connection), if document has
  // been fetched and there are none, then show prompt to continue account creation, if it hasn't been fetched
  // for some reason (especially if it is slow connection, retry, and then show error message which says error occured try again later).
  // if it has been fetched and there are documents, then just redirect to app etc.

  async resendConfirmation() {
    //Resend email here

    var text = document.getElementById("sentEmail");

    this.flyingLetterAnimation.play();
    setTimeout(() => {
      text.style.display = "block";
    }, 800);
    setTimeout(() => {
      text.style.display = "none";
    }, 2200);
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

  private listenToEmailVerification(
    timeToExpiry = 60000,
    intervalBetweenChecks = 1000
  ): Observable<void> {
    return this.afAuth.user.pipe(
      // in case email has been resent and there are multiple listenToEmailVerification()
      // observables being listened to
      // takeUntil(this.emailVerificationState.pipe(filter((state)=> state === "verified"))),
      takeUntil(timer(timeToExpiry)),
      auditTime(intervalBetweenChecks),
      tap(async (user) => {
        await this.afAuth.updateCurrentUser(user);
        await user?.reload();
        console.log("checking if email is verified:", user?.emailVerified);
      }),
      filter((user) => !!user?.emailVerified),
      take(1),
      map(() => this.emailVerificationState.next("verified"))
    );
  }

  /**
   * Select state = "sent" if it is the first time we are sending an email verification,
   * select state = "resent" if we are resending
   */
  private sendEmailVerification(state: "sent" | "resent"): Observable<void> {
    return this.afAuth.user.pipe(
      take(1),
      switchMap((user) =>
        user.sendEmailVerification().then(() => this.emailVerificationState.next(state))
      )
    );
  }

  private requestAccountCreation(): Observable<void | firebase.auth.UserCredential> {
    const email: string = this.authForm.get("email").value;
    const password: string = this.authForm.get("password").value;

    if (!this.authForm.valid || !email || !password) return of();

    return this.signup.createFirebaseAccount(email, password).pipe(
      catchError((error) => {
        console.log("error at signup", error);
        let messageToDisplay = "Could not sign you up. Please try again.";
        if (error?.message) messageToDisplay = error?.message;
        // if (error.code === "auth/email-already-in-use") {
        //   messageToDisplay = "The email address is already in use by another account.";
        // }
        // if (error.code === "auth/weak-password") {

        // }
        // if (error.code === "TOO_MANY_ATTEMPTS_TRY_LATER") {
        //   messageToDisplay =
        //     "We have blocked all requests from this device due to unusual activity. Try again later.";
        // }
        return concat(
          this.displaySignupFailedAlert(messageToDisplay),
          of(this.authForm.reset(this.emptyAuthForm))
        );
      })
    );
  }

  private async displaySignupFailedAlert(message: string): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: "Signup Failed",
      message: message,
      buttons: ["Okay"],
    });

    return alert.present();
  }

  ngOnDestroy() {
    this.signupSub.unsubscribe();
  }
}
