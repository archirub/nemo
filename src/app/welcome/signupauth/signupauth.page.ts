import { Component, OnInit, ViewChild, ElementRef } from "@angular/core";
import { AngularFireAuth } from "@angular/fire/compat/auth";
import { FormBuilder, FormControl, FormGroup, Validators } from "@angular/forms";
import { Router } from "@angular/router";
import { FlyingLetterAnimation } from "@animations/letter.animation";
import { AuthResponseData } from "@interfaces/auth-response.model";
import { AlertController, IonIcon, IonSlides, NavController } from "@ionic/angular";
import { SignupService } from "@services/signup/signup.service";
import { SignupAuthMethodSharer } from "./signupauth-method-sharer.service";
import { BehaviorSubject, concat, from, Observable, of, Subscription, timer } from "rxjs";
import {
  auditTime,
  catchError,
  concatMap,
  distinctUntilChanged,
  exhaustMap,
  filter,
  map,
  switchMap,
  take,
  takeUntil,
  tap,
} from "rxjs/operators";
import { UserCredential } from "@angular/fire/auth";

type EmailVerificationState = "not-sent" | "sent" | "resent" | "verified";
type ResendVerificationState = "available" | "not-available";
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

  prevReqTime: number = undefined;

  validatorChecks: object;

  awaitingConfirm: boolean = true;
  confirmed: boolean = false;

  private emailVerificationState = new BehaviorSubject<EmailVerificationState>(
    "not-sent"
  );
  public emailVerificationState$ = this.emailVerificationState.asObservable().pipe(
    distinctUntilChanged((prev, curr) => {
      // since there can be multiple resend of the email verification, we don't want to filter these out
      if (
        (prev === "resent" && curr === "resent") ||
        (prev === "sent" && curr === "sent")
      )
        return false;
      // however, any repeating "sent", "verified" or "not-sent" in a row will be filtered out
      else return prev === curr;
    })
  );

  private resendVerificationState = new BehaviorSubject<ResendVerificationState>(
    "available"
  );
  public resendVerificationState$ = this.resendVerificationState.asObservable();

  // is a getter function to get a different object ref everytime
  get emptyAuthForm() {
    return new FormGroup({
      email: new FormControl("", [
        Validators.required,
        Validators.email,
        Validators.pattern("[a-zA-Z]*@[a-zA-Z]*.ac.uk"),
      ]),
      password: new FormControl("", [Validators.required, Validators.minLength(8)]),
    });
  }

  authForm: FormGroup;

  signupSub: Subscription;

  constructor(
    private alertCtrl: AlertController,
    private router: Router,
    private signup: SignupService,
    private afAuth: AngularFireAuth,
    private SignupAuthMethodSharer: SignupAuthMethodSharer,
    private navCtrl: NavController
  ) {
    this.authForm = this.emptyAuthForm;
  }

  ngOnInit() {
    // for use in global-state-management service
    this.SignupAuthMethodSharer.defineGoStraightToEmailVerification(
      this.goStraightToEmailVerification.bind(this)
    );

    this.emailVerificationAnimationLogic().subscribe();

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

  returnToLanding() {
    this.navCtrl.navigateBack("/welcome");
  }

  moveToOptional() {
    this.navCtrl.navigateForward("/welcome/signuprequired");
  }

  public async onSubmitAuthData(): Promise<void> {
    await this.requestAccountCreation()
      .pipe(
        filter((val) => !!val),
        switchMap(() =>
          concat(this.sendEmailVerification("sent"), this.listenToEmailVerification())
        )
      )
      .toPromise();
  }

  public async resendEmailVerification() {
    this.resendEmailVerificationAnimation();
    return this.sendEmailVerification("resent").toPromise();
  }

  public emailVerificationAnimationLogic(): Observable<any> {
    return this.emailVerificationState$.pipe(
      concatMap((state) => {
        if (state === "sent") return this.sendEmailVerificationAnimation();
        if (state === "resent") return this.resendEmailVerificationAnimation();
        if (state === "verified") return this.verifiedEmailVerificationAnimation();
        return of();
      })
    );
  }

  private async sendEmailVerificationAnimation() {
    //N/A
  }

  private async resendEmailVerificationAnimation() {

    this.flyingLetterAnimation.play(); //Play send email animation

    this.resendVerificationState.next('not-available'); //Changing state disables the button

    const waitTime = timer(20000);
    waitTime.subscribe(() => {
      this.resendVerificationState.next('available'); //After 20 seconds, revert state to available
    });
  }

  private async verifiedEmailVerificationAnimation() {
    this.updatePager();
  }

  /**
   * Checks whether the field on the current slide has valid value, allows continuing if true, input
   * entry (string): the field of the form to check validator for, e.g. email, password
   * If on the final validator, password, submits form instead of sliding to next slide
   * THIS SHOULD BE USED ON THE NEXT SLIDE BUTTONS
   **/
  validateAndSlide(entry) {
    var validity = this.authForm.get(entry).valid; // Check validator

    if (validity === true) {
      Object.values(this.validatorChecks).forEach(
        (element) => (element.style.display = "none")
      ); // Hide all "invalid" UI

      if (entry === "password") {
        // If password valid, submit form
        console.log("Submitting auth data...");
        this.onSubmitAuthData();
      }

      this.unlockAndSlideToNext(); // If others valid, slide next
    } else {
      this.validatorChecks[entry].style.display = "flex"; // Show "invalid" UI for invalid validator
      console.log("Not valid, don't slide");
    }
  }

  async updatePager() {
    var email = document.getElementById("email");
    var hourglass = document.getElementById("hourglass");
    var pass = document.getElementById("pass");

    //Map to use slide index to get correct pager icon
    var map = {
      0: email,
      1: pass,
      2: hourglass,
    };

    for (let i = 0; i < 3; i++) {
      map[i].style.display = "none"; //Display none of the pager icons
    }

    //Hide all pager dots
    var dots: HTMLCollectionOf<any> = document.getElementsByClassName("pager-dot");
    Array.from(dots).forEach((element) => (element.style.display = "none"));

    //Get current slide, calculate slides left
    var l = await this.slides.length();
    var current = await this.slides.getActiveIndex();
    this.slidesLeft = l - current - 1;

    //Show only the necessary number of pager dots equal to this.slidesLeft
    var slice = Array.from(dots).slice(0, this.slidesLeft);
    slice.forEach((element) => (element.style.display = "block"));

    //Display pager icon for current slide
    map[current].style.display = "block";
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

  private listenToEmailVerification(
    // timeToExpiry = 60000,
    intervalBetweenChecks = 1000
  ): Observable<void> {
    // yoo
    return this.afAuth.user.pipe(
      // in case email has been resent and there are multiple listenToEmailVerification()
      // observables being listened to
      // takeUntil(this.emailVerificationState.pipe(filter((state)=> state === "verified"))),
      // takeUntil(timer(timeToExpiry)),
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

  private requestAccountCreation(): Observable<void | UserCredential> {
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

  /**
   * Meant to be used only in the global-state-management service,
   * whenever a new user object enters the Firebase auth state but doesn't have a verified email.
   * This is meant to work in sync with the "unverifiedAccountDeletionScheduler" cloud function
   * which will delete any account that isn't verified after a certain threshold of time.
   * This better guarantees a user that is found to be authed but isn't verified was indeed
   * in the middle of signing up
   */
  public async goStraightToEmailVerification(): Promise<void> {
    const user = await this.afAuth.currentUser;
    console.log("user", user);
    if (!user) return;
    if (this.router.url !== "/welcome/signupauth") {
      const alert = await this.alertCtrl.create({
        header: "Email Verification Required",
        message: `
        We have detected that your account doesn't have its email verified yet.
        We will now redirect you to the email verification page for you to finish the procedure.
        `,
        buttons: ["Okay"],
      });
      alert.onDidDismiss().then(() => this.router.navigateByUrl("/welcome/signupauth"));
      return alert.present();
    }
    await this.unlockAndSlideTo(1);
    await this.sendEmailVerification("sent").toPromise();
  }

  ngOnDestroy() {
    //this.signupSub.unsubscribe();
  }
}
