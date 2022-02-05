import { checkEmailValidityResponse } from "./../../shared/interfaces/cloud-functions.model";
import { IonSlides, NavController } from "@ionic/angular";
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
import { AngularFireFunctions } from "@angular/fire/functions";

import {
  BehaviorSubject,
  concat,
  firstValueFrom,
  interval,
  lastValueFrom,
  Observable,
  of,
  Subscription,
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
} from "rxjs/operators";

import { UniversitiesStore } from "@stores/universities/universities.service";

import { SignupService } from "@services/signup/signup.service";
import { SignupAuthMethodSharer } from "./signupauth-method-sharer.service";
import { EmailVerificationService } from "./email-verification.service";
import { GlobalErrorHandler } from "@services/errors/global-error-handler.service";

import { FireAuthUserCredential } from "@interfaces/firebase.model";
import { FlyingLetterAnimation } from "@animations/letter.animation";
import { LoadingAndAlertManager } from "@services/loader-and-alert-manager/loader-and-alert-manager.service";

@Component({
  selector: "app-signupauth",
  templateUrl: "./signupauth.page.html",
  styleUrls: ["../welcome.page.scss"],
})
export class SignupauthPage implements OnInit {
  // for DEV purposes
  async devVerifyEmail() {
    return firstValueFrom(
      this.afFunctions
        .httpsCallable("makeEmailVerified")({})
        .pipe(
          tap((res) => console.log("makeEmailVerified cloud function response: ", res)),
          this.errorHandler.convertErrors("cloud-functions"),
          this.errorHandler.handleErrors()
        )
    );
  }

  emailSendingInterval = 30; // (s)
  slidesLeft: number;
  validatorChecks: object;
  authForm: FormGroup;

  subs: Subscription = new Subscription();

  @ViewChild("slides") slidesRef: IonSlides;
  @ViewChild("email", { read: ElementRef }) emailRef: ElementRef;
  @ViewChild("testing", { read: ElementRef }) testingRef: ElementRef;

  private resendingIsAvailable = new BehaviorSubject<boolean>(true);
  private timeToResendingAvailable = new BehaviorSubject<number>(
    this.emailSendingInterval
  );

  emailVerificationState$ = this.emailService.emailVerificationState$;
  universityOptions$ = this.universitiesStore.optionsList$;
  resendingIsAvailable$ = this.resendingIsAvailable.asObservable();
  timeToResendingAvailable$ = this.timeToResendingAvailable.asObservable();

  emailAnimationsHandler$ = this.emailVerificationState$.pipe(
    concatMap((state) => {
      if (state === "sent") return this.emailSentAnimation();
      if (state === "resent") return this.emailResentAnimation();
      if (state === "verified") return this.emailVerifiedAnimation();
      return of("");
    })
  );

  timerResendingHandler$ = this.emailService.emailVerificationState$.pipe(
    filter((state) => state === "sent" || state === "resent"),
    concatMap(() => this.resendingIsAvailable$),
    take(1),
    filter((canResend) => canResend),
    map(() => this.resendingIsAvailable.next(false)),
    exhaustMap(() =>
      interval(1000).pipe(
        take(this.emailSendingInterval + 1),
        map((count) => {
          const timeLeftUntilAvailable = this.emailSendingInterval - count;
          this.timeToResendingAvailable.next(timeLeftUntilAvailable);
          this.changeDetector.detectChanges();
          if (timeLeftUntilAvailable === 0) this.resendingIsAvailable.next(true);
        })
      )
    )
  );

  // is a getter function to get a different object ref everytime
  get emptyAuthForm() {
    return new FormGroup({
      email: new FormControl("", [Validators.required, Validators.email]),
      password: new FormControl("", [Validators.required, Validators.minLength(8)]),
    });
  }

  constructor(
    private router: Router,
    private changeDetector: ChangeDetectorRef,
    private renderer: Renderer2,
    private navCtrl: NavController,

    private afFunctions: AngularFireFunctions,

    private universitiesStore: UniversitiesStore,

    private loaderAlertManager: LoadingAndAlertManager,
    private errorHandler: GlobalErrorHandler,
    private signup: SignupService,
    private emailService: EmailVerificationService,
    // private loading: LoadingService,
    private SignupAuthMethodSharer: SignupAuthMethodSharer
  ) {
    this.authForm = this.emptyAuthForm;
  }

  ngOnInit() {
    this.subs.add(this.emailAnimationsHandler$.subscribe());
    this.subs.add(this.timerResendingHandler$.subscribe());

    // For global state management service
    this.SignupAuthMethodSharer.defineGoStraightToEmailVerification(
      this.goStraightToEmailVerification.bind(this)
    );
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

  async onSlideFromEmail() {
    const emailControl = this.authForm.get("email");

    if (!emailControl.valid) {
      this.renderer.setStyle(
        this.testingRef.nativeElement,
        "border",
        "10px solid red !important"
      );
      emailControl.setErrors({ incorrect: true });
      return;
    }

    const loader = await this.loaderAlertManager.createLoading({
      message: "Checking validity...",
    });

    const alert = await this.loaderAlertManager.createAlert({
      header: "The email you have entered is invalid",
      message: "Make sure your university is on the list.",
      buttons: ["Okay"],
    });

    try {
      await this.loaderAlertManager.presentNew(loader, "replace-erase");

      const isValid = await this.isEmailValid(emailControl.value);

      if (isValid) {
        await this.loaderAlertManager.dismissDisplayed();
        return this.slideToNext();
      }

      return this.loaderAlertManager.presentNew(alert, "replace-erase");
    } catch (e) {
      const errorAlert = await this.loaderAlertManager.createAlert({
        header: "An unknown error occurred",
        message: "Please try again or come back later.",
        buttons: ["Okay"],
      });

      return this.loaderAlertManager.presentNew(errorAlert, "replace-erase");
    }
  }

  async onSlideFromPassword() {
    const emailControl = this.authForm.get("email");
    const passwordControl = this.authForm.get("password");

    if (!emailControl.valid || !passwordControl.valid) return;

    const loader = await this.loaderAlertManager.createLoading();
    const alert = await this.loaderAlertManager.createAlert({
      header: "Invalid Email",
      message: "Please change the email address you have provided.",
      buttons: ["Okay"],
    });

    try {
      await this.loaderAlertManager.presentNew(loader, "replace-erase");

      const isValid = await this.isEmailValid(emailControl.value);

      if (!isValid) {
        await this.loaderAlertManager.dismissDisplayed();
        await this.goToSlide(0);

        return this.loaderAlertManager.presentNew(alert, "replace-erase");
      }

      try {
        await this.requestAccountCreation();
      } catch {
        return this.loaderAlertManager.dismissDisplayed(); // logic to handle in case of error here is all in requestAccountCreation()
      }

      await this.loaderAlertManager.dismissDisplayed();
      await this.slideToNext();
      await lastValueFrom(this.emailService.sendVerificationToUser("sent"));
      await lastValueFrom(this.emailService.listenForVerification());
    } catch (e) {
      const errorAlert = await this.loaderAlertManager.createAlert({
        header: "An unknown error occurred",
        message: "Please try again or come back later.",
        buttons: ["Okay"],
      });

      return this.loaderAlertManager.presentNew(errorAlert, "replace-erase");
    }
  }

  async onSlideFromVerification() {
    const user = await this.errorHandler.getCurrentUser();
    if (!user) return;

    await user.reload();
    await user.getIdToken(true); // to refresh the token

    if (!user.emailVerified) return;

    return this.navCtrl.navigateForward("/welcome/signuprequired");
  }

  private requestAccountCreation(): Promise<void | FireAuthUserCredential> {
    const email: string = this.authForm.get("email").value;
    const password: string = this.authForm.get("password").value;

    if (!this.authForm.valid || !email || !password) return;

    return firstValueFrom(
      this.signup.createFirebaseAccount(email, password).pipe(
        catchError((error) => {
          // re-throwing error so that the chain of logic from "onSlideFromPassword" is stopped
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
    );
  }

  public async onSendingEmail(state: "sent" | "resent") {
    FlyingLetterAnimation(this.emailRef).play();
    return firstValueFrom(
      this.resendingIsAvailable$.pipe(
        filter((canResend) => canResend),
        switchMap(() => this.emailService.sendVerificationToUser(state))
      )
    );
  }

  public async resendEmailVerification() {
    this.emailResentAnimation();
    return firstValueFrom(this.emailService.sendVerificationToUser("resent"));
  }

  private isEmailValid(email: string): Promise<boolean> {
    return firstValueFrom(
      this.afFunctions
        .httpsCallable("checkEmailValidity")({ email })
        .pipe(
          this.errorHandler.convertErrors("cloud-functions"),
          map((res: checkEmailValidityResponse) => {
            return !!res?.isValid;
          }),
          this.errorHandler.handleErrors()
        ) as Observable<boolean>
    );
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
    const user = await this.errorHandler.getCurrentUser();
    if (!user) return; // still necessary. In case of error, since the error is handled, the chain of logic will keep going

    const slideIndex = await this.slidesRef.getActiveIndex();

    if (this.router.url === "/welcome/signupauth") {
      if (slideIndex === 2) {
        console.log("user already on right slide and page for email verification");
        return;
      }

      console.log("user on right page but wrong slide for email verification");
      await this.goToSlide(2);
      await lastValueFrom(this.emailService.sendVerificationToUser("sent"));
      return lastValueFrom(this.emailService.listenForVerification());
    }

    console.log("user on wrong page and wrong slide for email verification");

    const alert = await this.loaderAlertManager.createAlert({
      header: "Email Verification Required",
      message: `
        We have detected that your account doesn't have its email verified yet.
        We will now redirect you to the email verification page for you to finish the procedure.
        `,
      buttons: ["Okay"],
    });

    alert.onDidDismiss().then(() => this.router.navigateByUrl("/welcome/signupauth"));

    return this.loaderAlertManager.presentNew(alert, "replace-erase");
  }

  async onWeakPassword() {
    const alert = await this.loaderAlertManager.createAlert({
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

    return this.loaderAlertManager.presentNew(alert, "replace-erase");
  }

  async onEmailAlreadyInUse() {
    let outcome: "tryAnotherEmail" | "signIn";
    const tryAnotherEmailProcedure = () => {
      this.authForm.reset(this.emptyAuthForm);
      return this.goToSlide(0);
    };
    const signInProcedure = () => this.navCtrl.navigateRoot("/welcome/login");

    const alert = await this.loaderAlertManager.createAlert({
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

    return this.loaderAlertManager.presentNew(alert, "replace-erase");
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

  private async displaySignupFailedAlert(
    message: string,
    header?: string
  ): Promise<void> {
    const alert = await this.loaderAlertManager.createAlert({
      header: header ?? "Signup Failed",
      message: message,
      buttons: ["Okay"],
    });

    return this.loaderAlertManager.presentNew(alert, "replace-erase");
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

  ngOnDestroy() {
    this.subs.unsubscribe();
  }
}
