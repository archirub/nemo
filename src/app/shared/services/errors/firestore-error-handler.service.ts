import { Injectable } from "@angular/core";

import { catchError, concatMapTo, defer, Observable } from "rxjs";

import { CommonErrorFunctions } from "./common-error-functions";

import { FirebaseAuthService } from "@services/firebase-auth/firebase-auth.service";

import {
  CustomError,
  CustomErrorHandler,
  ErrorText,
  defaultErrorText,
} from "@interfaces/index";
import { FirestoreErrorType } from "@interfaces/firebase.model";

@Injectable({
  providedIn: "root",
})
export class FirestoreErrorHandler
  implements CustomErrorHandler<"firestore", FirestoreCode>
{
  errorType = "firestore" as const;

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
    return catchError<any, Observable<T>>((err: FirestoreErrorType) => {
      throw new CustomError(
        err?.code as any,
        this.errorType,
        err,
        this.getErrorText(err?.code)
      );
    });
  }

  handleErrors<T>() {
    return (source: Observable<T>) =>
      source.pipe(
        this.handleRetry<T>(),
        this.handleAlreadyExists<T>(),
        this.handleUnauthenticated<T>(),
        this.handleErrorOut<T>(),
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

  typeMatches(type: any): type is "firestore" {
    return type === this.errorType;
  }

  getErrorText(code: FirestoreCode): ErrorText {
    if (this.codeMatches(code, this.errorCodes.unauthenticated))
      return {
        header: "No User Signed In",
        message:
          "It looks like no user is signed in. You will now be taken back to the welcome page. Sorry for the inconvenience.",
      };

    return defaultErrorText;
  }
}

export type FirestoreCode = typeof FirestoreErrorCodes[number];

export const FirestoreErrorCodes = [
  // ACTION - To try again
  "aborted", // = The operation was aborted, typically due to a concurrency issue like transaction aborts, etc.
  "cancelled", // = The operation was cancelled (typically by the caller).
  "failed-precondition", // = Operation was rejected because the system is not in a state required for the operation's execution.
  "unavailable", // = The service is currently unavailable. This is a most likely a transient condition and may be corrected by retrying with a backoff.
  "deadline-exceeded", // = Deadline expired before operation could complete.

  // ACTION - (depends)
  // For creation of documents, it depends on what the scenario is (so look at where you create documents
  // and see from there). But maybe just continue the chain of logic if possible? Or maybe delete the document
  // and create a new one instead
  "already-exists", // = Some document that we attempted to create already exists.

  // ACTION - To error out, cannot recover from that
  "data-loss", // = Unrecoverable data loss or corruption.
  "internal", // = Internal errors. Means some invariants expected by underlying system has been broken. If you see one of these errors, something is very broken.
  "invalid-argument", // = Client specified an invalid argument.
  "not-found", // = Some requested document was not found.
  "out-of-range", // = Operation was attempted past the valid range.
  "resource-exhausted", // = Some resource has been exhausted, perhaps a per-user quota, or perhaps the entire file system is out of space.
  "unimplemented", // = Operation is not implemented or not supported/enabled.
  "unknown", // = Unknown error or an error from a different error domain.

  // ACTION - check auth state and and logout if no user is authed, otherwise error out to default
  "permission-denied", // The caller does not have permission to execute the specified operation.
  "unauthenticated",

  // Basically not gonna happen so just default
] as const;
