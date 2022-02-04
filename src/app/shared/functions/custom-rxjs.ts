import { filter, Observable, tap } from "rxjs";

const valueLogger = (name: string) => (val) => console.log(`${name}: ${val}`);

export const LogValue = (obsName: string) => (source: Observable<any>) =>
  source.pipe(tap(valueLogger(obsName)));

export const FilterFalsy = () => (source: Observable<any>) =>
  source.pipe(filter((val) => !!val));

export const SubscribeAndLog = (obs$: Observable<any>, obsName: string) =>
  obs$.subscribe(valueLogger(obsName));
