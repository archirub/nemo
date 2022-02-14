import { catchError, filter, Observable, tap, throwError, TimeoutError } from "rxjs";

const valueLogger = (name: string) => (val) => console.log(name, ":", val);

export const Logger =
  <T>(obsName: string) =>
  (source: Observable<T>) =>
    source.pipe(tap<T>(valueLogger(obsName)));

export const FilterFalsy =
  <T>() =>
  (source: Observable<T>) =>
    source.pipe(filter((val) => !!val));

export const SubscribeAndLog = (obs$: Observable<any>, obsName: string) =>
  obs$.subscribe(valueLogger(obsName));

export const catchTimeout =
  <T>(todo$: Observable<any>) =>
  (source: Observable<T>) =>
    source.pipe(
      catchError((error) => {
        // Error...
        // Handle 'timeout over' error
        if (error instanceof TimeoutError) {
          return todo$;
        }

        // Return other errors
        return throwError(() => error);
      })
    );
