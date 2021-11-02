import { AuthErrorType } from "@interfaces/index";
import { AlertController } from "@ionic/angular";
import { Observable, throwError } from "rxjs";
import { catchError } from "rxjs/operators";

const alertCtrl = new AlertController();

type AuthErrorCode =
  | "auth/app-deleted"
  | "auth/app-not-authorized"
  | "auth/argument-error"
  | "auth/invalid-api-key"
  | "auth/invalid-user-token"
  | "auth/invalid-tenant-id"
  | "auth/network-request-failed"
  | "auth/operation-not-allowed"
  | "auth/requires-recent-login"
  | "auth/too-many-requests"
  | "auth/unauthorized-domain"
  | "auth/user-disabled"
  | "auth/user-token-expired"
  | "auth/web-storage-unsupported";

("auth/network-request-failed");

function catchFirebaseAuthErrors<T>() {
  return function (source: Observable<T>) {
    return source.pipe(
      catchError((err: AuthErrorType) => {
        console.error("error occured");
        if (!err?.code || !err.code.startsWith("auth/")) return throwError(err);

        console.error("error is FirebaseAuthError", JSON.stringify(err));
        if ((err.code as AuthErrorCode) === "auth/too-many-requests")
          return throwError(err)
            .pipe
            // catchUnauthenticated(),
            // catchPermissionDenied(),
            // catchAny()
            ();
      })
    );
  };
}

function resetUserState() {}

function reAuthenticate() {}
