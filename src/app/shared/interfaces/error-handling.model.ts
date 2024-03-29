import { FirebaseStorageCode } from "./../services/errors/firebase-storage-error-handler.service";
import { CloudFunctionCode } from "@services/errors/cloud-functions-error-handler.service";
import { FirebaseAuthCode } from "@services/errors/firebase-auth-error-handler.service";
import { FirestoreCode } from "@services/errors/firestore-error-handler.service";
import { Observable, OperatorFunction } from "rxjs";

export const CHECK_AUTH_STATE = "local/check-auth-state";
export const CANNOT_RECOVER = "local/cannot-recover";
export const TRY_AGAIN = "local/try-again";
export const DEFAULT = "local/default";

export const localErrorCodes = [
  DEFAULT,
  CHECK_AUTH_STATE,
  CANNOT_RECOVER,
  TRY_AGAIN,
] as const;
export type LocalErrorCode = typeof localErrorCodes[number];
export type ErrorCode =
  | LocalErrorCode
  | FirebaseAuthCode
  | CloudFunctionCode
  | FirebaseStorageCode
  | FirestoreCode;

export const errorTypes = [
  "local",
  "firebase-auth",
  "firestore",
  "firebase-storage",
  "cloud-functions",
] as const;
export type ErrorType = typeof errorTypes[number];

export class CustomError {
  type: ErrorType = "local";
  code: ErrorCode = DEFAULT;
  text: ErrorText = defaultErrorText;
  originalError: any = null;

  constructor(
    code: ErrorCode,
    type: ErrorType,
    originalError?: Exclude<any, ErrorText>,
    text?: ErrorText
  ) {
    code ? (this.code = code) : null;
    code && type ? (this.type = type) : null;
    text ? (this.text = text) : null;
    originalError ? (this.originalError = originalError) : null;
  }
}

export interface ErrorText {
  header: string;
  message: string;
}

export const defaultErrorText = {
  header: "An error occurred...",
  message: "We were unable to complete your request, please try again.",
};

export interface CustomErrorHandler<errType extends ErrorType, errCodeType> {
  errorType: errType;
  errorCodes: {
    [codeCategory: string]: readonly errCodeType[];
  };
  errorConverter: () => OperatorFunction<any, any>;
  handleErrors: () => (source: Observable<any>) => Observable<any>;
  errorMatches: (error: CustomError, codes: errCodeType[]) => boolean;
  codeMatches: (code: any, codes: errCodeType[]) => code is errCodeType;
  typeMatches: (type: any) => type is errType;
  getErrorText: (code: errCodeType) => ErrorText;
}

export const SIGNAL_ERROR_WAS_HANDLED = "signal_error_was_handled";
export type SignalErrorWasHandled = typeof SIGNAL_ERROR_WAS_HANDLED;

// explanation of strategies -  in case of error:
// "endStream" just ends the stream after the error was handled
// "fallback" switches to the observable provided
// "propagateError" makes it go through the error handling system but then returns an error at the end
// "dontHandle" makes it skip the error handling system and return an error

export type ErrorHandlingStrategy =
  | "endStream"
  | "fallback"
  | "propagateError"
  | "dontHandle";
export interface GlobalErrorHandlerOptions {
  strategy: ErrorHandlingStrategy;
  debugMsg?: string;
  fallback$?: Observable<any>;
}

export interface CustomGlobalErrorHandler {
  convertErrors: (type: Exclude<ErrorType, "local">) => OperatorFunction<any, any>;
  handleErrors: <T>(options?: GlobalErrorHandlerOptions) => // defaultValue: any,
  // fallback$: Observable<any>
  (source: Observable<any>) => Observable<any>;
}
