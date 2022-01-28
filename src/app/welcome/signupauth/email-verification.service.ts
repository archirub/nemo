import { Injectable } from "@angular/core";
import { AngularFireAuth } from "@angular/fire/auth";

import { BehaviorSubject, defer, firstValueFrom, Observable } from "rxjs";
import {
  auditTime,
  exhaustMap,
  filter,
  first,
  map,
  share,
  switchMap,
  takeUntil,
  tap,
} from "rxjs/operators";

import { GlobalErrorHandler } from "@services/errors/global-error-handler.service";

import { CustomError } from "@interfaces/error-handling.model";

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

  constructor(
    private afAuth: AngularFireAuth,

    private errorHandler: GlobalErrorHandler
  ) {}

  public listenForVerification(intervalBetweenChecks = 2000): Observable<void> {
    return this.errorHandler.getCurrentUser$().pipe(
      tap((user) => {
        if (!user) throw new CustomError("local/check-auth-state", "local");
      }),
      auditTime(intervalBetweenChecks),
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
      first(),
      map(() => this.emailVerificationState.next("verified")),
      share(),
      this.errorHandler.handleErrors()
    ) as Observable<void>;
  }

  /**
   * Select state = "sent" if it is the first time we are sending an email verification,
   * select state = "resent" if we are resending
   */
  public sendVerificationToUser(state: "sent" | "resent"): Observable<void> {
    return this.errorHandler.getCurrentUser$().pipe(
      tap((user) => {
        if (!user) throw new CustomError("local/check-auth-state", "local");
      }),
      first(),
      switchMap((user) =>
        defer(() => user.sendEmailVerification()).pipe(
          this.errorHandler.convertErrors("firebase-auth"),
          tap(() => this.emailVerificationState.next(state))
        )
      ),
      this.errorHandler.handleErrors()
    ) as Observable<void>;
  }

  private emailIsVerified() {
    return this.emailVerificationState.pipe(filter((state) => state === "verified"));
  }
}
