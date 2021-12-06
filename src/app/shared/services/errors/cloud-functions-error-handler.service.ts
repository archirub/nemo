import { Injectable } from "@angular/core";

import { catchError, concatMapTo, defer, mapTo, Observable } from "rxjs";

import { FirebaseAuthService } from "@services/firebase-auth/firebase-auth.service";
import { CommonErrorFunctions } from "./common-error-functions";

import { FirestoreErrorCodes } from "./firestore-error-handler.service";
import {
  CustomError,
  CustomErrorHandler,
  ErrorText,
  defaultErrorText,
  CloudFunctionsErrorType,
} from "@interfaces/index";

export type CloudFunctionCode = typeof FirestoreErrorCodes[number];

// the Cloud functions error codes appear to be the same as the Firestore.
// This service is identical to the firestore error handler (written December 4th 2021)
@Injectable({
  providedIn: "root",
})
export class CloudFunctionsErrorHandler
  implements CustomErrorHandler<"cloud-functions", CloudFunctionCode>
{
  errorType = "cloud-functions" as const;

  errorCodes = {
    retry: [
      "aborted",
      "cancelled",
      "failed-precondition",
      "unavailable",
      "deadline-exceeded",
    ] as const,
    alreadyExists: ["already-exists"] as const,
    errorOut: [
      "permission-denied",
      "data-loss",
      "internal",
      "invalid-argument",
      "not-found",
      "out-of-range",
      "resource-exhausted",
      "unimplemented",
      "unknown",
    ] as const,
    unauthenticated: ["unauthenticated"] as const,
  };

  constructor(
    private errFunctions: CommonErrorFunctions,
    private firebaseAuth: FirebaseAuthService
  ) {}

  errorConverter<T>() {
    return catchError<any, Observable<T>>((err: CloudFunctionsErrorType) => {
      throw new CustomError(
        err?.code as any,
        this.errorType,
        err,
        this.getErrorText(err?.code as any)
      );
    });
  }

  handleErrors<T>() {
    return (source: Observable<T>) =>
      source.pipe(
        this.handleErrorOut<T>(),
        this.handleUnauthenticated<T>(),
        this.handleRetry<T>(),
        this.handleAlreadyExists<T>(),
        this.handleDefault<T>()
      );
  }

  private handleRetry<T>() {
    const errorMatches = (err: CustomError) =>
      this.errorMatches(err, this.errorCodes.retry as any);

    return this.errFunctions.customRetryWhen<T>(errorMatches, 3);
  }

  private handleAlreadyExists<T>() {
    return catchError<T, Observable<T>>((err: CustomError) => {
      if (!this.errorMatches(err, this.errorCodes.alreadyExists as any)) throw err;

      // using this mapTo hoping that the stream will continue? It might make no sense why we'd want it to continue here in particular though
      return this.errFunctions.presentErrorMessage(err?.text);
    });
  }

  private handleUnauthenticated<T>() {
    const errorMatches = (err: CustomError) =>
      this.errorMatches(err, this.errorCodes.unauthenticated);

    const lastRetryTask$ = (err: CustomError) =>
      this.errFunctions
        .presentErrorMessage(this.getErrorText(err?.code as FirestoreCode))
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
      if (!this.typeMatches(err?.type)) throw err;

      return this.errFunctions.presentErrorMessage(
        this.getErrorText(err?.code as FirestoreCode)
      );
    });
  }

  errorMatches(error: CustomError, codes: readonly FirestoreCode[]): boolean {
    return this.typeMatches(error?.type) && this.codeMatches(error?.code, codes);
  }

  codeMatches(code: any, codes: readonly FirestoreCode[]): code is FirestoreCode {
    return codes.includes(code);
  }

  typeMatches(type: any): type is "cloud-functions" {
    return type === this.errorType;
  }

  getErrorText(code: FirestoreCode): ErrorText {
    if (this.codeMatches(code, this.errorCodes.unauthenticated))
      return {
        header: "Authentication Error",
        message:
          "It looks like no user is signed in. You will now be taken back to the welcome page. Sorry for the inconvenience.",
      };

    return defaultErrorText;
  }
}

export type FirestoreCode = typeof FirestoreErrorCodes[number];
