import { Injectable } from "@angular/core";

import { catchError, Observable, OperatorFunction, of } from "rxjs";

import { CloudFunctionsErrorHandler } from "./cloud-functions-error-handler.service";
import { FirestoreErrorHandler } from "./firestore-error-handler.service";
import { FirebaseAuthErrorHandler } from "./firebase-auth-error-handler.service";
import { FirebaseStorageErrorHandler } from "./firebase-storage-error-handler.service";
import { LocalErrorHandler } from "./local-error-handler.service";

import { CustomError, ErrorType, CustomGlobalErrorHandler } from "@interfaces/index";

// next to do (Dec 4th 2021):
// - Create error converter in each error handler
// - Create local error handler
// - Clean up global error handler
// - Check circular dependency issues by serving
// - Implement error handling everywhere (by adding handleErrors() and errorConverters where appropriate)
// - Also change the things that throw local errors to new CustomError("local", .....)
// - Create system that reports the errors to me (maybe Firebase has such a functionality?)

@Injectable({
  providedIn: "root",
})
export class GlobalErrorHandler implements CustomGlobalErrorHandler {
  constructor(
    private firestoreEH: FirestoreErrorHandler,
    private fAuthEH: FirebaseAuthErrorHandler,
    private fStorageEH: FirebaseStorageErrorHandler,
    private cloudFunctionsEH: CloudFunctionsErrorHandler,
    private localEH: LocalErrorHandler
  ) {}

  convertErrors<T>(type: Exclude<ErrorType, "local">): OperatorFunction<T, T> {
    if (type === "firebase-auth") return this.fAuthEH.errorConverter<T>();
    if (type === "firestore") return this.firestoreEH.errorConverter<T>();
    if (type === "firebase-storage") return this.fStorageEH.errorConverter<T>();
    if (type === "cloud-functions") return this.cloudFunctionsEH.errorConverter<T>();
    throw new Error(
      "Type " + type + " is not allowed in errorConverter of GlobalErrorHandler."
    );
  }

  handleErrors<T>() {
    return (source: Observable<T>) =>
      source.pipe(
        this.errorConverterSafeguard<T>(),
        // DEV
        catchError<T, Observable<T>>((err: CustomError) => {
          console.error("Error through GlobalErrorHandler:", err);
          throw err;
        }),

        this.localEH.handleErrors<T>(),
        // catchError<T, Observable<T>>((err: CustomError) => {
        //   debugger;
        //   throw err;
        // }),

        this.firestoreEH.handleErrors<T>(),
        // catchError<T, Observable<T>>((err: CustomError) => {
        //   debugger;
        //   throw err;
        // }),

        this.fAuthEH.handleErrors<T>(),
        // catchError<T, Observable<T>>((err: CustomError) => {
        //   debugger;
        //   throw err;
        // }),

        this.cloudFunctionsEH.handleErrors<T>(),
        // catchError<T, Observable<T>>((err: CustomError) => {
        //   debugger;
        //   throw err;
        // }),
        this.fStorageEH.handleErrors<T>()
      ) as Observable<T>;
  }

  // added here so that other services and components can always only import the
  // global error handler. Sometimes services will important localEH directly to prevent
  // circular dependencies
  getCurrentUser(): Promise<firebase.default.User> {
    return this.localEH.getCurrentUser();
  }

  getCurrentUser$(): Observable<firebase.default.User> {
    return this.localEH.getCurrentUser$();
  }

  private errorConverterSafeguard<T>() {
    return catchError<T, Observable<T>>((err) => {
      if (err instanceof CustomError) throw err;
      throw new CustomError(null, null, err);
    });
  }
}
