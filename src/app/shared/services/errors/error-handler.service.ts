import { error } from "@angular/compiler/src/util";
import { Injectable, NgZone } from "@angular/core";
import { CustomError, ErrorName, ERROR_NAMES } from "@interfaces/index";
import { AlertController } from "@ionic/angular";
import { FirebaseAuthService } from "@services/firebase-auth/firebase-auth.service";
import {
  catchError,
  delay,
  exhaustMap,
  finalize,
  first,
  from,
  iif,
  map,
  merge,
  NEVER,
  Observable,
  ObservableInput,
  of,
  reduce,
  retry,
  retryWhen,
  scan,
  startWith,
  Subject,
  Subscription,
  switchMap,
  take,
  takeUntil,
  tap,
  throwError,
} from "rxjs";
import { onErrorResumeNext } from "rxjs/operators";
// import { operate } from "node_modules/rxjs/src/internal/util/lift";
// import { innerFrom } from "node_modules/rxjs/src/internal/observable/innerFrom";
// import { OperatorSubscriber } from "node_modules/rxjs/src/internal/operators/OperatorSubscriber";
// import {
//   ObservableInput,
//   OperatorFunction,
//   ObservedValueOf,
// } from "node_modules/rxjs/src/internal/types";

type ErrorHandlingFunction = (err: any, caught: Observable<any>) => ObservableInput<any>;

@Injectable({
  providedIn: "root",
})
export class ErrorHandler {
  private error$ = new Subject<any>();

  // handle$ = this.error$.pipe(exhaustMap((err) => this.presentErrorMessage(err)));

  // this is used in the internal working of the observables
  // It is to stop retrying in a given specific error logic if the error obtained is different
  // than that of the specific error logic. That way it just goes directly to the finalize.
  // It is not ideal at all, but it's better than nothing.
  // Now if you don't have anything to do in particular for finalize, we want to display the
  // default error prompt. So either maybe retrow an error? But I don't think that works.
  // Otherwise just have that handleDefault logic within the finalize?
  errorIsDifferent$ = new Subject<"">();

  constructor(
    private alertCtrl: AlertController,
    private zone: NgZone,
    private firebaseAuth: FirebaseAuthService
  ) {}

  globalErrorHandler() {
    const uniqueString = "some sort of unique string";
    let latestError: ErrorName | null = null;
    let errorHandlerSub: Subscription | null = null;
    const errorSignaler = new Subject<typeof uniqueString>();

    const globalErrorHandler = (observable: Observable<any>) =>
      new Observable<any>((subscriber) => {
        console.log("NEW GLOBAL ERROR HANDLER INSTANCE");

        const resetErrorHandler = () => {
          if (errorHandlerSub) {
            errorHandlerSub.unsubscribe();
            errorHandlerSub = null;
          }
        };

        const startNewErrorHandler = (error: ErrorName) => {
          // get a new instance of the error handling operator
          const errorHandler = this.getErrorHandlingOperator(error);

          // This will emit when errorSignaler emits. The tap operator will then make
          // it throw an error, signaling to the errorHandler that it needs to do something
          // errorHandlerSub = merge(
          //   observable.pipe(
          //     catchError((err) => {
          //       console.log("ca pass pa rso ejc");
          //       throw error;
          //     })
          //     // globalErrorHandlerInstance
          //   ),
          //   errorSignaler
          // )
          // .pipe(

          errorHandlerSub = observable
            .pipe(
              globalErrorHandlerInstance,
              catchError(() => NEVER),
              startWith(""),
              exhaustMap(() => errorSignaler),
              tap((value) => {
                console.log("ASDKLJADLSKJ", value);
                throw error;
                // if (value === uniqueString) throw error;
              }),
              // globalErrorHandlerInstance,
              // catchError((err) => {
              //   if (err === error) throw error;
              //   return of("");
              // }),
              errorHandler
            )
            .subscribe();
        };

        const subscription = observable.subscribe({
          next: (value) => {
            // if value is emited, then that means the error hasn't occured again
            // hence stop the subscription
            resetErrorHandler();
            subscriber.next(value);
          },
          error: (error: ErrorName) => {
            // subscriber.error(error);
            // For errors which aren't part of logic, just pass them on
            if (!ERROR_NAMES.includes(error)) return subscriber.error(error);

            // For case where error is not the same as before.
            // Stop the current error handling strategy,
            // Start a new one to the appropriate handler
            if (latestError !== error) {
              resetErrorHandler();
              startNewErrorHandler(error);
            }
            latestError = error;

            // signals the curent errorHandler that there is a new error
            errorSignaler.next(uniqueString);
          },
          complete() {
            resetErrorHandler();
            subscriber.complete();
          },
        });

        return () => {
          console.log("GlobalErrorHandler subscription unsubscribed", errorHandlerSub);
          resetErrorHandler();
          subscription.unsubscribe();
        };
      });
    const globalErrorHandlerInstance = globalErrorHandler;
    return globalErrorHandlerInstance;
  }

  getErrorHandlingOperator(
    error: ErrorName
  ): (source: Observable<any>) => Observable<any> {
    if (error === "unauthenticated") return this.handleUnauthenticated();
    return this.handleDefault();
  }

  // globalErrorHandler2() {
  //   return (source: Observable<any>) => {
  //     return source.pipe(
  //       onErrorResumeNext(this.handleUnauthenticated2(), this.handleDefault2())
  //     );
  //   };
  // }

  handleErrors() {
    return (source: Observable<any>) => {
      return source.pipe(
        catchError((err) => {
          console.log("err came in", err);
          throw err;
        }),
        this.handleUnauthenticated(),
        this.handleDefault()
      );
    };
  }

  // handleUnauthenticated: ErrorHandlingFunction = (err, caught) =>  {
  //    return
  //   // return (err: any, caught: Observable<any>) => ObservableInput<any>
  // }

  handleDefault() {
    return (source: Observable<any>) => {
      return source.pipe(
        catchError((error: ErrorName, caught) => this.presentErrorMessage({}))
      );
    };
  }

  handleUnauthenticated() {
    // const errorName: ErrorName = "unauthenticated";
    const numberOfRetriesWanted = 2;
    const delayAmount = 2000;

    return (source: Observable<any>) => {
      return source.pipe(
        retryWhen((errors) =>
          errors.pipe(
            tap((err) => console.log("first error here", err)),
            take(numberOfRetriesWanted),
            delay(delayAmount), // delay between retries
            reduce((acc, value) => acc + 1, 1)
            // map(() => "asdalsdasd")
            // map((v) => {
            //   console.log("ici la valeur elle est", v);
            //   if (v === numberOfRetriesWanted) throw "yo";
            //   return "yo";
            // })
          )
        ),
        catchError(() =>
          this.presentErrorMessage({
            header: "No user signed in...",
            message: `You'll now be taken back to the welcome page. Sorry for the inconvenience.`,
          })
        ) // Commented out for DEV
        // .pipe(switchMap(() => this.firebaseAuth.logOut()))
      );
    };
  }

  presentErrorMessage(error: CustomError) {
    return from(
      this.zone.run(async () => {
        const alert = await this.alertCtrl.create({
          header: error.header ?? "An unknown error occured",
          message: error.message ?? null,
          buttons: error.buttons ?? ["Okay"],
        });

        await alert.present();

        // returns this so that the following actions are only taken once the alert is dismissed
        return alert.onDidDismiss();
      })
    );
  }
}

// export function catchError_<T, O extends ObservableInput<any>>(
//   selector: (err: any, caught: Observable<T>) => O
// ): OperatorFunction<T, T | ObservedValueOf<O>> {
//   return operate((source, subscriber) => {
//     let innerSub: Subscription | null = null;
//     let syncUnsub = false;
//     let handledResult: Observable<ObservedValueOf<O>>;

//     innerSub = source.subscribe(
//       new OperatorSubscriber(subscriber, undefined, undefined, (err) => {
//         handledResult = innerFrom(selector(err, catchError(selector)(source)));
//         if (innerSub) {
//           innerSub.unsubscribe();
//           innerSub = null;
//           handledResult.subscribe(subscriber);
//         } else {
//           // We don't have an innerSub yet, that means the error was synchronous
//           // because the subscribe call hasn't returned yet.
//           syncUnsub = true;
//         }
//       })
//     );

//     if (syncUnsub) {
//       // We have a synchronous error, we need to make sure to
//       // teardown right away. This ensures that `finalize` is called
//       // at the right time, and that teardown occurs at the expected
//       // time between the source error and the subscription to the
//       // next observable.
//       innerSub.unsubscribe();
//       innerSub = null;
//       handledResult!.subscribe(subscriber);
//     }
//   });
// }
