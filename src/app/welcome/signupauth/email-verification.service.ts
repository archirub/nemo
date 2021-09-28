import { ChangeDetectorRef, Injectable } from "@angular/core";
import { AngularFireAuth } from "@angular/fire/compat/auth";
import { BehaviorSubject, Observable } from "rxjs";
import {
  auditTime,
  concatMap,
  distinctUntilChanged,
  exhaustMap,
  filter,
  map,
  share,
  switchMap,
  take,
  takeUntil,
  tap,
} from "rxjs/operators";

export type EmailVerificationState = "not-sent" | "sent" | "resent" | "verified";

@Injectable({
  providedIn: "root",
})
export class EmailVerificationService {
  private emailVerificationState = new BehaviorSubject<EmailVerificationState>(
    "not-sent"
  );
  public emailVerificationState$ = this.emailVerificationState
    .asObservable()
    .pipe
    // distinctUntilChanged((prev, curr) => {
    //   // since there can be multiple resend of the email verification, we don't want to filter these out
    //   if ((curr === "resent" && curr === prev) || (curr === "sent" && curr === prev))
    //     return false;
    //   // however, any repeating "sent", "verified" or "not-sent" in a row will be filtered out
    //   else return curr === prev;
    // })
    ();

  constructor(private afAuth: AngularFireAuth) {}

  public listenForVerification(intervalBetweenChecks = 2000): Observable<void> {
    return this.afAuth.user.pipe(
      auditTime(intervalBetweenChecks),
      takeUntil(this.emailIsVerified()),
      exhaustMap(async (user) => {
        await this.afAuth.updateCurrentUser(user);
        await user?.reload();
        await user.getIdToken(true);
        console.log("Listening on email verification...");
        return user;
      }),
      filter((user) => !!user?.emailVerified),
      take(1),
      map(() => this.emailVerificationState.next("verified")),
      share()
    );
  }

  /**
   * Select state = "sent" if it is the first time we are sending an email verification,
   * select state = "resent" if we are resending
   */
  public sendVerificationToUser(state: "sent" | "resent"): Observable<void> {
    return this.afAuth.user.pipe(
      take(1),
      switchMap((user) =>
        user?.sendEmailVerification().then(() => this.emailVerificationState.next(state))
      )
    );
  }

  private emailIsVerified() {
    return this.emailVerificationState.pipe(filter((state) => state === "verified"));
  }
}
