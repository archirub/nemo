import { ChangeDetectorRef, Injectable, OnDestroy } from "@angular/core";
import { AngularFireAuth } from "@angular/fire/auth";

import {
  BehaviorSubject,
  defer,
  firstValueFrom,
  interval,
  Observable,
  of,
  ReplaySubject,
  Subject,
  Subscription,
} from "rxjs";
import {
  auditTime,
  concatMap,
  debounceTime,
  distinctUntilChanged,
  exhaustMap,
  filter,
  first,
  map,
  share,
  switchMap,
  switchMapTo,
  take,
  takeUntil,
  tap,
  throttleTime,
  withLatestFrom,
} from "rxjs/operators";

import { GlobalErrorHandler } from "@services/errors/global-error-handler.service";

import { CustomError } from "@interfaces/error-handling.model";
import { IonSlides, NavController } from "@ionic/angular";
import { LoadingAndAlertManager } from "@services/loader-and-alert-manager/loader-and-alert-manager.service";
import { Router } from "@angular/router";
import { Logger, SubscribeAndLog } from "src/app/shared/functions/custom-rxjs";

export type EmailVerificationState = "not-sent" | "sent" | "resent" | "verified";

@Injectable({
  providedIn: "root",
})
export class EmailVerificationService implements OnDestroy {
  subs = new Subscription();
  intervalBetweenChecks = 2000;
  emailSendingInterval = 60; // (s) (note!!: if it is too low it throws an error saying "too many requests", hence why it is high)

  private listeningForVerification = new BehaviorSubject<boolean>(false);
  private triggerSendVerification = new Subject<"">();

  private resendingIsAvailable = new BehaviorSubject<boolean>(true);
  public resendingIsAvailable$ = this.resendingIsAvailable.asObservable();

  private timeToResendingAvailable = new BehaviorSubject<number>(
    this.emailSendingInterval
  );
  public timeToResendingAvailable$ = this.timeToResendingAvailable.asObservable();

  // public for use in global state management because it gets triggered on each reload of the Firebase user
  // and we want to deactivate it during that time
  public listeningForVerification$ = this.listeningForVerification.pipe(
    distinctUntilChanged()
  );
  private triggerSendVerification$ = this.triggerSendVerification.pipe(
    throttleTime(10000)
  );

  private emailVerificationState = new BehaviorSubject<EmailVerificationState>(
    "not-sent"
  );
  public emailVerificationState$ = this.emailVerificationState.asObservable();

  // ugly logic, that is only for the "goStraightToEmailVerification", as the slides
  // only get init once you get to signupauth, so it needs to wait for it to go there and to get initialized
  public slidesRef$ = new ReplaySubject<IonSlides>(1);
  public goToSlide$ = new ReplaySubject<(index: number) => Promise<void>>(1);

  private handleSending$ = this.triggerSendVerification$.pipe(
    switchMap(() => this.sendEmailVerification$)
  );

  private handleListening$ = this.listeningForVerification$.pipe(
    switchMap((listen) => (listen ? this.listenForVerification$ : of("")))
  );

  handleResendingTimer$ = this.triggerSendVerification$.pipe(
    Logger("a"),
    withLatestFrom(this.resendingIsAvailable$),
    Logger("b"),
    filter(([_, canResend]) => canResend),
    Logger("c"),

    map(() => this.resendingIsAvailable.next(false)),
    exhaustMap(() =>
      interval(1000).pipe(
        take(this.emailSendingInterval + 1),
        map((count) => {
          const timeLeftUntilAvailable = this.emailSendingInterval - count;
          this.timeToResendingAvailable.next(timeLeftUntilAvailable);
          // this.detectChanges?.();
          if (timeLeftUntilAvailable === 0) this.resendingIsAvailable.next(true);
        })
      )
    )
  );

  constructor(
    private afAuth: AngularFireAuth,
    private loaderAlertManager: LoadingAndAlertManager,
    private navCtrl: NavController,
    private router: Router,

    private errorHandler: GlobalErrorHandler
  ) {
    this.subs.add(this.handleListening$.subscribe());
    this.subs.add(this.handleSending$.subscribe());

    SubscribeAndLog(this.emailVerificationState$, "emailVerificationState$");
    SubscribeAndLog(this.resendingIsAvailable$, "resendingIsAvailable$");

    SubscribeAndLog(this.timeToResendingAvailable$, "timeToResendingAvailable$");
  }

  public listenForVerification() {
    this.listeningForVerification.next(true);
  }

  /**
   * Select state = "sent" if it is the first time we are sending an email verification,
   * select state = "resent" if we are resending
   */
  public sendVerificationToUser(state: "sent" | "resent") {
    console.log("sendVerificationToUser");
    this.triggerSendVerification.next("");
    this.emailVerificationState.next(state);
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

    if (this.router.url === "/welcome/signupauth") {
      const slideIndex = await (await firstValueFrom(this.slidesRef$)).getActiveIndex();

      if (slideIndex === 2) return; // case where user already on right slide

      // case where we must go to slide and listen for verif and send verif
      await (
        await firstValueFrom(this.goToSlide$)
      )(2);
      this.sendVerificationToUser("sent");
      this.listenForVerification();
    } else {
      console.log("user on wrong page and wrong slide for email verification");

      const alert = await this.loaderAlertManager.createAlert({
        header: "Email Verification Required",
        message: `
        We have detected that your account doesn't have its email verified yet.
        We will now redirect you to the email verification page for you to finish the procedure.
        `,
        buttons: ["Okay"],
      });

      alert
        .onDidDismiss()
        .then(() => this.navCtrl.navigateForward("/welcome/signupauth"))
        .then(() => firstValueFrom(this.goToSlide$))
        .then((goToSlide) => goToSlide(2))
        .then(() => {
          this.sendVerificationToUser("sent");
          this.listenForVerification();
        });

      return this.loaderAlertManager.presentNew(alert, "replace-erase");
    }
  }

  private listenForVerification$ = this.errorHandler.getCurrentUser$().pipe(
    auditTime(this.intervalBetweenChecks),
    takeUntil(this.emailIsVerified()),
    exhaustMap(async (user) => {
      await firstValueFrom(
        defer(() => this.afAuth.updateCurrentUser(user)).pipe(
          this.errorHandler.convertErrors("firebase-auth")
        )
      );
      await user?.reload();
      await user.getIdToken(true);
      console.log("Listening on email verification...");
      return user;
    }),
    filter((user) => !!user?.emailVerified),
    take(1),
    tap(() => this.listeningForVerification.next(false)),
    tap(() => this.emailVerificationState.next("verified")),
    this.errorHandler.handleErrors()
  ) as Observable<void>;

  private sendEmailVerification$ = this.errorHandler.getCurrentUser$().pipe(
    Logger("sendEmailVerification triggering"),
    take(1),
    switchMap((user) =>
      defer(() => user.sendEmailVerification()).pipe(
        this.errorHandler.convertErrors("firebase-auth")
      )
    )
  );

  setGoToSlide(val: (i: number) => Promise<void>) {
    this.goToSlide$.next(val);
  }

  private emailIsVerified() {
    return this.emailVerificationState.pipe(filter((state) => state === "verified"));
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }
}
