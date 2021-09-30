import { checkEmailValidityResponse } from "./../../shared/interfaces/cloud-functions.model";
import {
  AlertController,
  IonSlides,
  LoadingController,
  NavController,
} from "@ionic/angular";
import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  ChangeDetectorRef,
  Renderer2,
} from "@angular/core";
import { FormControl, FormGroup, Validators } from "@angular/forms";
import { Router } from "@angular/router";

import { AngularFireAuth } from "@angular/fire/auth";
import { AngularFireFunctions } from "@angular/fire/functions";

import {
  BehaviorSubject,
  concat,
  from,
  interval,
  Observable,
  of,
  Subscription,
  timer,
} from "rxjs";
import {
  catchError,
  concatMap,
  exhaustMap,
  filter,
  map,
  switchMap,
  take,
  tap,
  withLatestFrom,
} from "rxjs/operators";

import { FlyingLetterAnimation } from "@animations/letter.animation";
import { SignupService } from "@services/signup/signup.service";
import { SignupAuthMethodSharer } from "./signupauth-method-sharer.service";
import {
  EmailVerificationService,
  EmailVerificationState,
} from "./email-verification.service";
import { LoadingService } from "@services/loading/loading.service";
import { UniversityName } from "@interfaces/universities.model";
import { UniversitiesStore } from "@stores/universities/universities.service";
import { takeWhile } from "lodash";
import { UserCredentialType } from "@interfaces/firebase.model";

@Component({
  selector: "app-signupauth",
  templateUrl: "./signupauth.page.html",
  styleUrls: ["../welcome.page.scss"],
})
export class SignupauthPage implements OnInit {
  @ViewChild("slides") slidesRef: IonSlides;
  @ViewChild("email", { read: ElementRef }) emailRef: ElementRef;
  @ViewChild("testing", { read: ElementRef }) testingRef: ElementRef;

  EMAIL_SENDING_INTERVAL = 30; // in seconds

  slidesLeft: number;

  validatorChecks: object;

  public emailVerificationState$: Observable<EmailVerificationState>;

  public universityOptions$: Observable<UniversityName[]>;

  private resendingIsAvailable = new BehaviorSubject<boolean>(true);
  public resendingIsAvailable$ = this.resendingIsAvailable.asObservable();

  private timeToResendingAvailable = new BehaviorSubject<number>(
    this.EMAIL_SENDING_INTERVAL
  );
  public timeToResendingAvailable$ = this.timeToResendingAvailable.asObservable();

  // is a getter function to get a different object ref everytime
  get emptyAuthForm() {
    return new FormGroup({
      email: new FormControl("", [Validators.required, Validators.email]),
      password: new FormControl("", [Validators.required, Validators.minLength(8)]),
    });
  }

  authForm: FormGroup;

  subs: Subscription = new Subscription();

  constructor(
    private alertCtrl: AlertController,
    private router: Router,
    private signup: SignupService,
    private afAuth: AngularFireAuth,
    private SignupAuthMethodSharer: SignupAuthMethodSharer,
    private navCtrl: NavController,
    private emailService: EmailVerificationService,
    private afFunctions: AngularFireFunctions,
    private loadingCtrl: LoadingController,
    private loading: LoadingService,
    private universitiesStore: UniversitiesStore,
    private changeDetector: ChangeDetectorRef,
    private renderer: Renderer2
  ) {
    this.authForm = this.emptyAuthForm;
  }

  ngOnInit() {
    this.emailVerificationState$ = this.emailService.emailVerificationState$;
    this.universityOptions$ = this.universitiesStore.optionsList$;

    // For global-state-management
    this.SignupAuthMethodSharer.defineGoStraightToEmailVerification(
      this.goStraightToEmailVerification.bind(this)
    );

    this.subs.add(this.emailAnimations().subscribe());
    this.subs.add(this.timerResendingLogic().subscribe());

    this.resendingIsAvailable$.subscribe((a) => console.log("resending is available", a));
    // this.timeToResendingAvailable$.subscribe((a) =>
    //   console.log("time to resending is available", a)
    // );
  }

  ionViewDidEnter() {
    this.slidesRef.lockSwipes(true);
    this.updatePager();

    this.validatorChecks = {
      email: document.getElementById("emailCheck"),
      password: document.getElementById("passCheck"),
    };

    FlyingLetterAnimation(this.emailRef).play(); //Play send email animation
  }

  private timerResendingLogic(): Observable<void> {
    return this.emailService.emailVerificationState$.pipe(
      filter((state) => state === "sent" || state === "resent"),
      concatMap(() => this.resendingIsAvailable$),
      take(1),
      filter((canResend) => canResend),
      tap(() => console.log("dalsdaks")),
      map(() => this.resendingIsAvailable.next(false)),
      exhaustMap(() =>
        interval(1000).pipe(
          take(this.EMAIL_SENDING_INTERVAL + 1),
          map((count) => {
            const timeLeftUntilAvailable = this.EMAIL_SENDING_INTERVAL - count;
            this.timeToResendingAvailable.next(timeLeftUntilAvailable);
            this.changeDetector.detectChanges();
            if (timeLeftUntilAvailable === 0) this.resendingIsAvailable.next(true);
          })
        )
      )
    );
  }

  public async onSendingEmail(state: "sent" | "resent") {
    FlyingLetterAnimation(this.emailRef).play();
    return this.resendingIsAvailable$
      .pipe(
        take(1),
        filter((canResend) => canResend),
        switchMap(() => this.emailService.sendVerificationToUser(state))
      )
      .toPromise();
  }

  public async resendEmailVerification() {
    this.emailResentAnimation();
    return this.emailService.sendVerificationToUser("resent").toPromise();
  }

  public emailAnimations(): Observable<any> {
    return this.emailVerificationState$.pipe(
      concatMap((state) => {
        if (state === "sent") return this.emailSentAnimation();
        if (state === "resent") return this.emailResentAnimation();
        if (state === "verified") return this.emailVerifiedAnimation();
        return of();
      })
    );
  }

  public async resendVerificationEmail() {
    return this.emailService.sendVerificationToUser("resent").toPromise();
  }

  private isEmailValid(email: string): Promise<boolean> {
    return this.afFunctions
      .httpsCallable("checkEmailValidity")({ email })
      .pipe(
        map((res: checkEmailValidityResponse) => {
          return !!res?.isValid;
        })
      )
      .toPromise();
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
    const slideIndex = await this.slidesRef.getActiveIndex();

    if (!user) return;

    if (this.router.url === "/welcome/signupauth") {
      if (slideIndex === 2) {
        console.log("user already on right slide and page for email verification");
        return;
      }

      console.log("user on right page but wrong slide for email verification");
      await this.goToSlide(2);
      await this.emailService.sendVerificationToUser("sent").toPromise();
      return this.emailService.listenForVerification().toPromise();
    }

    console.log("user on wrong page and wrong slide for email verification");
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

  public navigateToWelcome() {
    this.navCtrl.navigateBack("/welcome");
  }

  public async slideToPrevious() {
    await this.slidesRef.lockSwipes(false);
    await this.slidesRef.slidePrev();

    await this.updatePager();
    await this.slidesRef.lockSwipes(true);
  }

  private async slideToNext() {
    await this.slidesRef.lockSwipes(false);
    await this.slidesRef.slideNext();

    await this.updatePager();
    await this.slidesRef.lockSwipes(true);
  }

  private async goToSlide(index: number) {
    await this.slidesRef.lockSwipes(false);
    await this.slidesRef.slideTo(index);

    await this.updatePager();
    await this.slidesRef.lockSwipes(true);
  }

  private requestAccountCreation(): Promise<void | UserCredentialType> {
    const email: string = this.authForm.get("email").value;
    const password: string = this.authForm.get("password").value;

    if (!this.authForm.valid || !email || !password) return;

    return this.signup
      .createFirebaseAccount(email, password)
      .pipe(
        catchError((error) => {
          // rethrowing error so that the chain of logic from "onSlideFromPassword" is stopped
          let messageToDisplay = "Could not sign you up. Please try again.";
          if (error?.message) messageToDisplay = error?.message;
          if (error?.code === "auth/email-already-in-use") {
            this.onEmailAlreadyInUse();
            throw new error();
          }
          if (error?.code === "auth/weak-password") {
            this.onWeakPassword();
            throw new error();
          }
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
      )
      .toPromise();
  }

  async onWeakPassword() {
    const alert = await this.alertCtrl.create({
      header: "Password too weak",
      message:
        "The password you provided is too weak. Try a more complex or longer password.",
      backdropDismiss: true,
      buttons: [
        {
          text: "Okay",
        },
      ],
    });
    alert.onDidDismiss().then(() => {
      this.authForm.reset(this.emptyAuthForm);
      return this.goToSlide(1);
    });

    return alert.present();
  }

  async onEmailAlreadyInUse() {
    let outcome: "tryAnotherEmail" | "signIn";
    const tryAnotherEmailProcedure = () => {
      this.authForm.reset(this.emptyAuthForm);
      return this.goToSlide(0);
    };
    const signInProcedure = () => this.navCtrl.navigateRoot("/welcome/login");

    const alert = await this.alertCtrl.create({
      header: "This email is already in use",
      message: `
      The email you provided already has an account associated with it.
      If you are the owner of this account and would like to log into the app, 
      Go to the Sign In page. Otherwise, you may try another email address, or
      contact support if you have another issue.
    `,
      backdropDismiss: true,
      buttons: [
        {
          text: "Sign In",
          handler: () => {
            outcome = "signIn";
          },
        },
        {
          text: "Try another email",
          handler: () => {
            outcome = "tryAnotherEmail";
          },
        },
      ],
    });
    // this format is used otherwise it makes the slides buggy while it moves back to email
    alert.onDidDismiss().then(() => {
      if (outcome === "tryAnotherEmail") return tryAnotherEmailProcedure();
      if (outcome === "signIn") return signInProcedure().then(() => {});
    });

    return alert.present();
  }

  private async emailSentAnimation() {
    //N/A
  }

  private async emailResentAnimation() {
    return FlyingLetterAnimation(this.emailRef).play(); //Play send email animation
  }

  private async emailVerifiedAnimation() {
    return this.updatePager();
  }

  async onSlideFromEmail() {
    const emailControl = this.authForm.get("email");

    if (!emailControl.valid) {
      console.log("yo", this.renderer);
      this.renderer.setStyle(
        this.testingRef.nativeElement,
        "border",
        "10px solid red !important"
      );
      emailControl.setErrors({ incorrect: true });
      return;
    }

    const loader = await this.loadingCtrl.create({
      ...this.loading.defaultLoadingOptions,
      message: "Checking validity...",
    });
    const alert = await this.alertCtrl.create({
      header: "The email you have entered is invalid",
      message: "Make sure your university is on the list.",
      buttons: ["Okay"],
    });

    try {
      await loader.present();
      const isValid = await this.isEmailValid(emailControl.value);

      if (isValid) {
        await loader.dismiss();
        return this.slideToNext();
      }

      await loader.dismiss();
      return alert.present();
    } catch (e) {
      await loader?.dismiss();
      await alert?.dismiss();
      return this.alertCtrl
        .create({
          header: "An unknown error occured",
          message: "Please try again or come back later.",
          buttons: ["Okay"],
        })
        .then((a) => a.present());
    }
  }

  async onSlideFromPassword() {
    const emailControl = this.authForm.get("email");
    const passwordControl = this.authForm.get("password");

    if (!emailControl.valid || !passwordControl.valid) return;

    const loader = await this.loadingCtrl.create(this.loading.defaultLoadingOptions);
    const alert = await this.alertCtrl.create({
      header: "The email you have entered is invalid",
      message: "You have been redirected to change it to one that's valid.",
      buttons: ["Okay"],
    });

    try {
      await loader.present();

      const isValid = await this.isEmailValid(emailControl.value);

      if (!isValid) {
        await loader.dismiss();
        await this.goToSlide(0);
        return alert.present();
      }
      try {
        await this.requestAccountCreation();
      } catch {
        return loader.dismiss(); // logic to handle in case of error here is all in requestAccountCreation()
      }
      await this.slideToNext();
      await this.emailService.sendVerificationToUser("sent").toPromise();
      await this.emailService.listenForVerification().toPromise();
    } catch (e) {
      console.error(String(e));
      await loader?.dismiss();
      await alert?.dismiss();
      return this.alertCtrl
        .create({
          header: "An unknown error occured",
          message: "Please try again or come back later.",
          buttons: ["Okay"],
        })
        .then((a) => a.present());
    }
  }

  async onSlideFromVerification() {
    const user = await this.afAuth.currentUser;
    await user.reload();
    await user.getIdToken(true); // to refresh the token

    if (!user || !user.emailVerified) return;

    return this.navCtrl.navigateForward("/welcome/signuprequired");
  }

  async devVerifyEmail() {
    return this.afFunctions
      .httpsCallable("makeEmailVerified")({})
      .pipe(tap((res) => console.log("makeEmailVerified cloud fucntion response: ", res)))
      .toPromise();
  }

  private async updatePager() {
    const email = document.getElementById("email");
    const hourglass = document.getElementById("hourglass");
    const pass = document.getElementById("pass");

    //Map to use slide index to get correct pager icon
    const map = {
      0: email,
      1: pass,
      2: hourglass,
    };

    for (let i = 0; i < 3; i++) {
      this.renderer.setStyle(map[i], "display", "none"); //Display none of the pager icons
    }

    //Hide all pager dots
    const dots: HTMLCollectionOf<any> = document.getElementsByClassName("pager-dot");

    Array.from(dots).forEach((element) =>
      this.renderer.setStyle(element, "display", "none")
    );

    //Get current slide, calculate slides left
    const l = await this.slidesRef.length();
    const current = await this.slidesRef.getActiveIndex();
    this.slidesLeft = l - current - 1;

    //Show only the necessary number of pager dots equal to this.slidesLeft
    const slice = Array.from(dots).slice(0, this.slidesLeft);
    slice.forEach((element) => this.renderer.setStyle(element, "display", "block"));

    //Display pager icon for current slide
    this.renderer.setStyle(map[current], "display", "block");
  }

  private async displaySignupFailedAlert(
    message: string,
    header?: string
  ): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: header ?? "Signup Failed",
      message: message,
      buttons: ["Okay"],
    });

    return alert.present();
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }
}
