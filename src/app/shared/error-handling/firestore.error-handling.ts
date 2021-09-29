import { FirestoreErrorType } from "@interfaces/index";
import { AlertController } from "@ionic/angular";
import { Observable, throwError } from "rxjs";
import { catchError, map } from "rxjs/operators";

const alertCtrl = new AlertController();

type FirestoreErrorCode =
  | "cancelled"
  | "unknown"
  | "invalid-argument"
  | "deadline-exceeded"
  | "not-found"
  | "already-exists"
  | "permission-denied"
  | "resource-exhausted"
  | "failed-precondition"
  | "aborted"
  | "out-of-range"
  | "unimplemented"
  | "internal"
  | "unavailable"
  | "data-loss"
  | "unauthenticated";

// function catchFirestoreErrors<T>() {
//   return function (source: Observable<T>) {
//     return source.pipe(
//       catchError((err: FirestoreErrorType) => {
//         console.error("error occured");
//         if (!(err instance FirestoreError)) return throwError(err);
//         console.error("error is FirestoreError", JSON.stringify(err));

//         return throwError(err).pipe(
//           catchUnauthenticated(),
//           catchPermissionDenied(),
//           catchAny()
//         );
//       })
//     );
//   };
// }

function catchUnauthenticated() {
  return function (source: Observable<FirestoreErrorType>) {
    return source.pipe(
      catchError((err: FirestoreErrorType) => {
        if (err.code !== "unauthenticated") return throwError(err);
      })
    );
  };
}

function catchPermissionDenied() {
  return function (source: Observable<FirestoreErrorType>) {
    return source.pipe(
      catchError(async (err: FirestoreErrorType) => {
        if (err.code !== "permission-denied") return throwError(err);

        const alert = await alertCtrl.create({
          header: "",
          message: `An unknown error occured while attempting to talk to the server. 
            If this is affecting your experience, try again at a later time or contact our support team for assistance.`,
          buttons: ["Okay"],
        });
        return alert.present();
      })
    );
  };
}

function catchAny() {
  return function (source: Observable<FirestoreErrorType>) {
    return source.pipe(
      catchError(async (err: FirestoreErrorType) => {
        const alert = await alertCtrl.create({
          header: "An error occured",
          message: `An unknown error occured while attempting to talk to the server. 
          If this is affecting your experience, try again at a later time or contact our support team for assistance.`,
          buttons: ["Okay"],
        });
        return alert.present();
      })
    );
  };
}
