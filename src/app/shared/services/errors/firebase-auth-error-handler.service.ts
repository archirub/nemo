import { Injectable } from "@angular/core";

import { catchError, defer, Observable } from "rxjs";

// import { AlertService } from "@services/alert/alert.service";
import { FirebaseAuthService } from "@services/firebase-auth/firebase-auth.service";
import { CommonErrorFunctions } from "./common-error-functions";

import {
  CustomError,
  CustomErrorHandler,
  ErrorText,
  defaultErrorText,
} from "@interfaces/index";
import { FirebaseAuthErrorType } from "@interfaces/firebase.model";

@Injectable({
  providedIn: "root",
})
export class FirebaseAuthErrorHandler
  implements CustomErrorHandler<"firebase-auth", FirebaseAuthCode>
{
  errorType = "firebase-auth" as const;

  errorCodes = {
    errorOut: [
      "auth/email-already-in-use",
      "auth/email-already-exists",
      "auth/invalid-email",
      "auth/too-many-requests",
      "auth/user-disabled",
      "auth/invalid-password",
      "auth/user-not-found",
    ] as const,
    reauthenticate: ["auth/requires-recent-login"] as const,
    retry: ["auth/network-request-failed"] as const,
  };

  constructor(
    private errFunctions: CommonErrorFunctions,
    private firebaseAuth: FirebaseAuthService
  ) {}

  errorConverter<T>() {
    return catchError<T, Observable<T>>((err: FirebaseAuthErrorType) => {
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
        this.handleReauthenticate<T>(),
        this.handleRetry<T>(),
        this.handleDefault<T>()
      );
  }

  private handleErrorOut<T>() {
    return catchError<T, Observable<T>>((err: CustomError) => {
      if (!this.errorMatches(err, this.errorCodes.errorOut as any)) throw err;

      return this.errFunctions.presentErrorMessage(err?.text);
    });
  }

  private handleReauthenticate<T>() {
    return catchError<T, Observable<T>>((err: CustomError) => {
      if (!this.errorMatches(err, this.errorCodes.reauthenticate as any)) throw err;

      // DEV (written to get attention before release). This does not return empty at all in case of error
      return defer(() =>
        this.firebaseAuth.reAuthenticationProcedure()
      ) as unknown as Observable<T>;
    });
  }

  private handleRetry<T>() {
    const errorMatches = (err: CustomError) =>
      this.errorMatches(err, this.errorCodes.retry as any);

    return this.errFunctions.customRetryWhen<T>(errorMatches, 4);
  }

  private handleDefault<T>() {
    return catchError<T, Observable<T>>((err: CustomError) => {
      if (!this.typeMatches(err?.type)) throw err;

      return this.errFunctions.presentErrorMessage(this.getErrorText(err?.code as any));
    });
  }

  errorMatches(error: CustomError, codes: FirebaseAuthCode[]): boolean {
    return this.typeMatches(error?.type) && this.codeMatches(error?.code, codes);
  }

  codeMatches(code: any, codes: FirebaseAuthCode[]): code is FirebaseAuthCode {
    return codes.includes(code);
  }

  typeMatches(type: any): type is "firebase-auth" {
    return type === this.errorType;
  }

  getErrorText(code: FirebaseAuthCode): ErrorText {
    if (["auth/email-already-in-use", "auth/email-already-exists"].includes(code))
      return {
        header: "Email already in use",
        message:
          "If you already created an account with us, please use the login portal!",
      };

    if (code === "auth/invalid-email")
      return {
        header: "Invalid email",
        message:
          "Please check the email you entered and make sure it is properly formatted.",
      };

    if (code === "auth/too-many-requests")
      return {
        header: "Too many Attempts...",
        message:
          "Too many attempts were made. This account has been temporarily disabled. Please try again at a later time.",
      };

    if (code === "auth/user-disabled")
      return {
        header: "Account Disabled",
        message:
          "This account has been disabled. This may happen if you have infringed on our code of conduct. Please contact Nemo if you believe this is a mistake.",
      };

    if (code === "auth/weak-password")
      return {
        header: "Weak Password",
        message:
          "The password you provided is too weak. Try a more complex or longer password.",
      };

    if (code === "auth/invalid-password")
      return {
        header: "Password Incorrect",
        message:
          "The password you have provided is incorrect. Please try again or check that the email address you have provided is the correct one.",
      };

    if (code === "auth/user-not-found")
      return {
        header: "User not found",
        message:
          "Please check the spelling of the email you entered. If you'd like to create an account, use the signup menu instead!",
      };

    if (code === "auth/network-request-failed")
      return {
        header: "Connection Error",
        message:
          "There seems to be a problem with your Internet connection. Please check you're connected and try again.",
      };

    return defaultErrorText;
  }
}

export type FirebaseAuthCode = typeof firebaseAuthCodes[number];

const firebaseAuthCodes = [
  // ACTION - Error message (email already in use)
  "auth/email-already-in-use", // = Thrown if there already exists an account with the given email address.
  "auth/email-already-exists", // =	The provided email is already in use by an existing user. Each user must have a unique email.

  // ACTION - Error message (email is invalid)
  "auth/invalid-email", // =	The provided value for the email user property is invalid. It must be a string email address.

  // ACTION - Error message (try again later)
  "auth/too-many-requests", // = Thrown if requests are blocked from a device due to unusual activity. Trying again after some delay would unblock.

  // ACTION - Error message (Your account is disabled, please contact Nemo if you believe this is a mistake)
  "auth/user-disabled", // = Thrown if the user account has been disabled by an administrator. Accounts can be enabled or disabled in the Firebase Console, the Auth section and Users subsection.

  // ACTION - Error message (password is invalid)
  "auth/invalid-password", // =	The provided value for the password user property is invalid. It must be a string with at least six characters.
  "auth/weak-password",

  // ACTION - Error message (an error occurred)
  "auth/user-not-found", // =	There is no existing user record corresponding to the provided identifier.

  // ACTION - reauthentication procedure
  "auth/requires-recent-login", // = Thrown if the user's last sign-in time does not meet the security threshold. Use firebase.User.reauthenticateWithCredential to resolve. This does not apply if the user is anonymous.

  // ACTION - Retry and stop loading if there is loading
  "auth/network-request-failed", // = Thrown if a network error (such as timeout, interrupted connection or unreachable host) has occurred.

  // DEFAULT ACTION - Error message (an unknown error occurred. If this persists, please contact us.)
] as const;
