import { filter, Observable, tap } from "rxjs";

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
