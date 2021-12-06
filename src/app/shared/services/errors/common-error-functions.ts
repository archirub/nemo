import { Injectable, NgZone } from "@angular/core";

import {
  CustomError,
  defaultErrorText,
  ErrorText,
  LocalErrorCode,
  localErrorCodes,
} from "@interfaces/error-handling.model";
import { AlertController } from "@ionic/angular";

import {
  Observable,
  catchError,
  finalize,
  EMPTY,
  retryWhen,
  take,
  tap,
  concatMap,
  of,
  delay,
  defer,
} from "rxjs";

@Injectable({
  providedIn: "root",
})
export class CommonErrorFunctions {
  constructor(protected zone: NgZone, protected alertCtrl: AlertController) {}

  // DEV (writing that just to get my attention before release)
  // THIS THING RETURNING OBSERVABLE<T> IS A BIG LIE. IT IS JUST A TRICK SO THAT I DON'T
  // GET ERRORS EVERYWHERE IN TEMPLATE where handleError is applied, as otherwise it says the
  // type is unknown (which is the truth) instead of the type that it would be if there were no errors
  presentErrorMessage<T>(errorText: ErrorText) {
    // using defer so that promise isn't read right away (thereby presenting the error message)
    return defer(() =>
      this.zone.run(async () => {
        const alert = await this.alertCtrl.create({
          header: errorText?.header ?? defaultErrorText.header,
          message: errorText?.message ?? defaultErrorText.message,
          buttons: ["Okay"],
        });

        await alert.present();

        // returns this so that the following actions are only taken once the alert is dismissed
        return alert.onDidDismiss();
      })
    ) as Observable<T>;
  }

  tapForErrors<T>(task$?: Observable<any>) {
    return catchError<T, any>((err) => {
      if (!task$) throw err;

      return task$.pipe(
        finalize(() => {
          throw err;
        })
      );
    });
  }

  customCatchError<T>(errorCode: LocalErrorCode, task$: Observable<any> = EMPTY) {
    return catchError<any, Observable<T>>((err: LocalErrorCode) => {
      if (err !== errorCode) throw err;

      return task$;
    });
  }

  // if a default value is provided, then we take that to mean that we don't want the stream to complete
  // after all of the retries have been exhausted, but instead we want the stream to continue with a default value
  customRetryWhen<T>(
    errMatchChecker: (err: CustomError) => boolean, // checks whether the error coming in is supposed to be handled by this operator or not
    maxRetryCount: number,
    customLastRetryTask$: (err: CustomError) => Observable<any> = null, // default is to show an error message with the error's text
    defaultValue: any = null
  ) {
    const toDefault = "toDefault";
    const retryDelay = 2000;
    let retryCount = 0;

    return (source: Observable<T>) =>
      source.pipe(
        retryWhen<T>((errors) =>
          errors.pipe(
            take(maxRetryCount),
            tap(() => retryCount++),
            tap((err: CustomError) => {
              // to pass on error to next error handler
              if (!errMatchChecker(err)) throw err;
            }),
            concatMap((err) => {
              if (retryCount !== maxRetryCount) return of(err);
              if (customLastRetryTask$) return customLastRetryTask$(err);
              return this.presentErrorMessage(err?.text);
            }), // if last retry, do final task
            tap((err) => {
              if (defaultValue && retryCount === maxRetryCount) throw toDefault;
            }), // to continue stream and send a default value if one was provided
            delay(retryDelay) // delay at the end so that presenting error message is not delayed
          )
        ),
        catchError<T, Observable<T>>((err) => {
          if (err === toDefault) return of(defaultValue); // to send default value to subscriber
          throw err; // to pass on error to next error handler
        })
      );
  }

  isOwnError(err: any): err is CustomError {
    return err instanceof CustomError;
  }
}
