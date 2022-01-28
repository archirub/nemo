import { Injectable } from "@angular/core";

import { Observable, catchError, concatMapTo, defer, firstValueFrom, tap } from "rxjs";

import { CommonErrorFunctions } from "./common-error-functions";

import {
  CANNOT_RECOVER,
  CHECK_AUTH_STATE,
  CustomError,
  CustomErrorHandler,
  LocalErrorCode,
  TRY_AGAIN,
} from "@interfaces/index";
import { FirebaseLogoutService } from "@services/firebase-auth/firebase-logout.service";
import { AngularFireAuth } from "@angular/fire/auth";

@Injectable({
  providedIn: "root",
})
export class LocalErrorHandler implements CustomErrorHandler<"local", LocalErrorCode> {
  constructor(
    private errFunctions: CommonErrorFunctions,
    private firebaseLogout: FirebaseLogoutService,
    private afAuth: AngularFireAuth
  ) {}
  errorType = "local" as const;
  errorCodes = {
    checkAuthState: [CHECK_AUTH_STATE] as const,
    errorOut: [CANNOT_RECOVER] as const,
    retry: [TRY_AGAIN] as const,
  };
  errorConverter = null;
  getErrorText = null;

  handleErrors<T>() {
    return (source: Observable<T>) =>
      source.pipe(
        this.handleErrorOut<T>(),
        this.handleCheckAuthState<T>(),
        this.handleRetry<T>(),
        this.handleDefault<T>()
      );
  }

  // this function provides a way to obtain the current user with error handling attached to it
  // (import it from global error handler, only import from here if important from global
  // leads to circular dependency)
  getCurrentUser$(): Observable<firebase.default.User> {
    return this.afAuth.user.pipe(
      tap((user) => {
        if (!user) throw new CustomError("local/check-auth-state", "local");
      }),
      this.handleErrors()
    );
  }

  // promise version
  getCurrentUser(): Promise<firebase.default.User> {
    return firstValueFrom(this.getCurrentUser$());
  }

  private handleRetry<T>() {
    const errorMatches = (err: CustomError) =>
      this.errorMatches(err, this.errorCodes.retry as any);

    return this.errFunctions.customRetryWhen<T>(errorMatches, 3);
  }

  private handleCheckAuthState<T>() {
    const errorMatches = (err: CustomError) =>
      this.errorMatches(err, this.errorCodes.checkAuthState);

    const lastRetryTask$ = (err: CustomError) =>
      this.errFunctions
        .presentErrorMessage(err.text)
        .pipe(concatMapTo(defer(() => this.firebaseLogout.logOut())));

    return this.errFunctions.customRetryWhen<T>(errorMatches, 4, lastRetryTask$);
  }

  private handleErrorOut<T>() {
    return catchError<T, Observable<T>>((err: CustomError) => {
      if (!this.errorMatches(err, this.errorCodes.errorOut)) throw err;

      return this.errFunctions.presentErrorMessage(err?.text);
    });
  }

  private handleDefault<T>() {
    return catchError<T, Observable<T>>((err: CustomError) => {
      console.log(
        "hello there bro here",
        err.type,
        this.errorType,
        this.typeMatches(err.type)
      );
      if (!this.typeMatches(err.type)) throw err;

      return this.errFunctions.presentErrorMessage(err.text);
    });
  }

  errorMatches(error: CustomError, codes: readonly LocalErrorCode[]): boolean {
    return this.typeMatches(error?.type) && this.codeMatches(error?.code, codes);
  }

  codeMatches(code: any, codes: readonly LocalErrorCode[]): code is LocalErrorCode {
    return codes.includes(code);
  }

  typeMatches(type: any): type is "local" {
    return type === this.errorType;
  }
}
