import { Injectable } from "@angular/core";

import { catchError, concatMapTo, defer, Observable } from "rxjs";

import { FirebaseAuthService } from "@services/firebase-auth/firebase-auth.service";
import { CommonErrorFunctions } from "./common-error-functions";

import {
  CustomError,
  CustomErrorHandler,
  defaultErrorText,
  ErrorText,
} from "@interfaces/error-handling.model";
import { FirebaseStorageErrorType } from "@interfaces/firebase.model";

@Injectable({
  providedIn: "root",
})
export class FirebaseStorageErrorHandler
  implements CustomErrorHandler<"firebase-storage", FirebaseStorageCode>
{
  constructor(
    private errFunctions: CommonErrorFunctions,
    private firebaseAuth: FirebaseAuthService
  ) {}
  errorType = "firebase-storage" as const;
  errorCodes = {
    retry: [
      "storage/retry-limit-exceeded",
      "storage/cannot-slice-blob",
      "storage/server-file-wrong-size",
    ] as const,
    errorOut: [
      "storage/unknown",
      "storage/object-not-found",
      "storage/bucket-not-found",
      "storage/project-not-found",
      "storage/quota-exceeded",
      "storage/unauthorized",
      "storage/invalid-checksum",
      "storage/canceled",
      "storage/invalid-event-name",
      "storage/invalid-url",
      "storage/invalid-argument",
      "storage/no-default-bucket",
    ] as const,
    unauthenticated: ["storage/unauthenticated"] as const,
  };
  handleErrors<T>() {
    return (source: Observable<T>) =>
      source.pipe(
        this.handleErrorOut<T>(),
        this.handleUnauthenticated<T>(),
        this.handleRetry<T>(),
        this.handleDefault<T>()
      );
  }

  errorConverter<T>() {
    return catchError<T, Observable<T>>((err: FirebaseStorageErrorType) => {
      throw new CustomError(
        err?.code as any,
        this.errorType,
        err,
        this.getErrorText(err?.code as any)
      );
    });
  }

  private handleRetry<T>() {
    const errorMatches = (err: CustomError) =>
      this.errorMatches(err, this.errorCodes.retry as any);

    return this.errFunctions.customRetryWhen<T>(errorMatches, 3);
  }

  private handleUnauthenticated<T>() {
    const errorMatches = (err: CustomError) =>
      this.errorMatches(err, this.errorCodes.unauthenticated);

    const lastRetryTask$ = (err: CustomError) =>
      this.errFunctions
        .presentErrorMessage(this.getErrorText(err?.code as FirebaseStorageCode))
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
        this.getErrorText(err?.code as FirebaseStorageCode)
      );
    });
  }

  errorMatches(error: CustomError, codes: readonly FirebaseStorageCode[]): boolean {
    return this.typeMatches(error?.type) && this.codeMatches(error?.code, codes);
  }

  codeMatches(
    code: any,
    codes: readonly FirebaseStorageCode[]
  ): code is FirebaseStorageCode {
    return codes.includes(code);
  }

  typeMatches(type: any): type is "firebase-storage" {
    return type === this.errorType;
  }

  getErrorText(code: FirebaseStorageCode): ErrorText {
    if (this.codeMatches(code, this.errorCodes.unauthenticated))
      return {
        header: "Authentication Error",
        message:
          "It looks like no user is signed in. You will now be taken back to the welcome page. Sorry for the inconvenience.",
      };

    return defaultErrorText;
  }
}

export type FirebaseStorageCode = typeof firebaseStorageCodes[number];

export const firebaseStorageCodes = [
  // ACTION - unauthenticated user routine
  "storage/unauthenticated", // =	User is unauthenticated, please authenticate and try again.

  // ACTION - retry
  "storage/retry-limit-exceeded", // =	The maximum time limit on an operation (upload, download, delete, etc.) has been excceded. Try uploading again.
  "storage/cannot-slice-blob", // =	Commonly occurs when the local file has changed (deleted, saved again, etc.). Try uploading again after verifying that the file hasn't changed.
  "storage/server-file-wrong-size", // =	File on the client does not match the size of the file recieved by the server. Try uploading again.

  // ACTION - error out
  "storage/unknown", // =	An unknown error occurred.
  "storage/object-not-found", // =	No object exists at the desired reference.
  "storage/bucket-not-found", // =	No bucket is configured for Cloud Storage
  "storage/project-not-found", // =	No project is configured for Cloud Storage
  "storage/quota-exceeded", // =	Quota on your Cloud Storage bucket has been exceeded. If you're on the free tier, upgrade to a paid plan. If you're on a paid plan, reach out to Firebase support.
  "storage/unauthorized", // =	User is not authorized to perform the desired action, check your security rules to ensure they are correct.
  "storage/invalid-checksum", // =	File on the client does not match the checksum of the file received by the server. Try uploading again.
  "storage/canceled", // =	User canceled the operation.
  "storage/invalid-event-name", // =	Invalid event name provided. Must be one of [`running`, `progress`, `pause`]
  "storage/invalid-url", // =	Invalid URL provided to refFromURL(). Must be of the form: gs://bucket/object or https://firebasestorage.googleapis.com/v0/b/bucket/o/object?token=<TOKEN>
  "storage/invalid-argument", // =	The argument passed to put() must be `File`, `Blob`, or `UInt8` Array. The argument passed to putString() must be a raw, `Base64`, or `Base64URL` string.
  "storage/no-default-bucket", // =	No bucket has been set in your config's storageBucket property.
] as const;
