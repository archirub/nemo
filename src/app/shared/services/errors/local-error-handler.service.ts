import { Injectable } from "@angular/core";

import { Observable, catchError, concatMapTo, defer } from "rxjs";

import { CommonErrorFunctions } from "./common-error-functions";

import { FirebaseAuthService } from "@services/firebase-auth/firebase-auth.service";

import {
  CANNOT_RECOVER,
  CHECK_AUTH_STATE,
  CustomError,
  CustomErrorHandler,
  LocalErrorCode,
  TRY_AGAIN,
} from "@interfaces/index";

@Injectable({
  providedIn: "root",
})
export class LocalErrorHandler implements CustomErrorHandler<"local", LocalErrorCode> {
  constructor(
    private errFunctions: CommonErrorFunctions,
    private firebaseAuth: FirebaseAuthService
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
        .pipe(concatMapTo(defer(() => this.firebaseAuth.logOut())));

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
