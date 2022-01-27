import {
  BehaviorSubject,
  concat,
  distinctUntilChanged,
  filter,
  forkJoin,
  interval,
  map,
  Observable,
  ReplaySubject,
  switchMap,
  take,
  tap,
  withLatestFrom,
} from "rxjs";
import { Injectable } from "@angular/core";
import { AngularFirestore } from "@angular/fire/firestore";
import { CustomError } from "@interfaces/error-handling.model";
import {
  privateProfileFromDatabase,
  SwipeCapDocument,
  SwipeCapGeneralDocument,
} from "@interfaces/profile.model";
import { GlobalErrorHandler } from "@services/errors/global-error-handler.service";
import { CurrentUserStore } from "..";
import { AbstractStoreService } from "@interfaces/stores.model";
import { StoreResetter } from "@services/global-state-management/store-resetter.service";

type SwipeState = "init" | "";
type SwipeCapMap = { swipesLeft: number; date: Date };

@Injectable({
  providedIn: "root",
})
export class SwipeCapService extends AbstractStoreService {
  public isReady$: Observable<boolean> = null;

  private minSwipes = 0;
  private maxSwipes = 20; // default value (max of the gauge)
  private increaseRateMillis = 1 / (3600 * 1000); // default value (1 per hour)

  private swipesLeft = new BehaviorSubject<SwipeCapMap>(null);
  swipesLeft$ = this.swipesLeft.asObservable().pipe(distinctUntilChanged());
  state$ = new BehaviorSubject<SwipeState>("init");

  get defaultSwipeCapMap(): SwipeCapMap {
    return { swipesLeft: this.maxSwipes, date: new Date() };
  }

  constructor(
    private fs: AngularFirestore,

    private errorHandler: GlobalErrorHandler,
    protected resetter: StoreResetter
  ) {
    super(resetter);
  }

  protected systemsToActivate(): Observable<any> {
    return concat(
      this.fetchSwipeCapGeneral(),
      this.fetchSwipeCapUser(),
      this.manageSwipeIncrement()
    );
  }

  protected resetStore(): void {
    this.state$.next("init");
    this.swipesLeft.next(null);
    console.log("swipes-cap store reset.");
  }

  useSwipe() {
    return this.swipesLeft$.pipe(
      take(1),
      // important: here we keep the date the same, as the purpose of the date is to calculate
      // the increase in the swipes left based on how long has elapsed since it was last increased.
      // It is a recording of the last time the swipes left were incremented using the increase rate
      map((s) =>
        this.swipesLeft.next({
          swipesLeft: this.adjustRange(s.swipesLeft - 1),
          date: s.date,
        })
      )
    );
  }

  canUseSwipe(): Observable<boolean> {
    return this.swipesLeft$.pipe(
      take(1),
      map((sl) => (sl?.swipesLeft ? sl.swipesLeft >= 1 : true))
    );
  }

  manageSwipeIncrement() {
    return interval(10000).pipe(
      map(() => new Date()),
      withLatestFrom(this.swipesLeft$),
      filter(([_, swipesLeft]) => !!swipesLeft),
      map(([newDate, swipesLeft]) =>
        this.getNewSwipesLeft(swipesLeft.swipesLeft, swipesLeft.date, newDate)
      ),
      map((newSwipesLeft) => this.swipesLeft.next(newSwipesLeft))
    );
  }

  fetchSwipeCapGeneral() {
    const snapshot = this.fs
      .collection("general")
      .doc<SwipeCapGeneralDocument>("swipeCap")
      .get();

    return snapshot.pipe(
      take(1),
      map((doc) => {
        if (!doc.exists) return;

        const data = doc.data();

        if (data.increaseRatePerHour) {
          this.increaseRateMillis = data.increaseRatePerHour / (3600 * 1000);
        }

        if (data.maxSwipes) {
          this.maxSwipes = data.maxSwipes;
        }
      })
    );
  }

  fetchSwipeCapUser() {
    const uid$ = this.errorHandler.getCurrentUser$().pipe(
      tap((u) => {
        if (!u) throw new CustomError("local/check-auth-state", "local");
      }),
      map((u) => u.uid),
      this.errorHandler.handleErrors()
    );

    const snapshot = (uid: string) =>
      this.fs
        .collection("profiles")
        .doc(uid)
        .collection("private")
        .doc<SwipeCapDocument>("swipeCap")
        .get();

    return uid$.pipe(
      switchMap((uid) => snapshot(uid)),
      take(1),
      map((doc) => {
        if (!doc.exists) return this.defaultSwipeCapMap;
        const data = doc.data();
        return this.getNewSwipesLeft(data.swipesLeft, data.date.toDate(), new Date());
      }),
      map((swipesLeft) => this.swipesLeft.next(swipesLeft))
    );
  }

  getNewSwipesLeft(prevSwipesLeft: number, prevDate: Date, newDate: Date): SwipeCapMap {
    const timeElapsed = newDate.getTime() - prevDate.getTime();

    let newSwipesLeft = prevSwipesLeft + timeElapsed * this.increaseRateMillis;
    newSwipesLeft = this.adjustRange(newSwipesLeft);

    return { swipesLeft: newSwipesLeft, date: newDate };
  }

  adjustRange(swipesLeft: number): number {
    return Math.min(this.maxSwipes, Math.max(this.minSwipes, swipesLeft));
  }
}
