import { Injectable } from "@angular/core";
import { AngularFireAuth } from "@angular/fire/auth";
import { AngularFirestore } from "@angular/fire/firestore";

import { BehaviorSubject, defer, firstValueFrom, Observable, of } from "rxjs";
import {
  distinctUntilChanged,
  exhaustMap,
  filter,
  map,
  switchMap,
  take,
  tap,
  withLatestFrom,
} from "rxjs/operators";

import { CurrentUserStore } from "@stores/current-user/current-user-store.service";
import { FormatService } from "@services/format/format.service";

import { SearchCriteria } from "@classes/index";
import { CustomError, privateProfileFromDatabase } from "@interfaces/index";
import { GlobalErrorHandler } from "@services/errors/global-error-handler.service";
import { AbstractStoreService } from "@interfaces/stores.model";
import { StoreResetter } from "@services/global-state-management/store-resetter.service";
import { UniversitiesStore } from "@stores/universities/universities.service";
import { FilterFalsy } from "../../functions/custom-rxjs";

@Injectable({
  providedIn: "root",
})
export class SearchCriteriaStore extends AbstractStoreService {
  // don't call next on this directly, instead use "nextOnSearchCriteria"
  private searchCriteria = new BehaviorSubject<SearchCriteria>(this.emptySearchCriteria);
  private isReady = new BehaviorSubject<boolean>(false);

  searchCriteria$ = this.searchCriteria.asObservable();
  isReady$ = this.isReady.asObservable().pipe(distinctUntilChanged());

  get emptySearchCriteria() {
    return new SearchCriteria({});
  }

  private nextOnSearchCriteria(newSC: SearchCriteria) {
    return this.uniStore.optionsList$.pipe(
      FilterFalsy(),
      take(1),
      map((uniList) => {
        //safety so that, if there aren't multiple unis shown, then criteria on them are
        // deactivated
        if (uniList.length <= 1) {
          newSC.university = null;
        }

        this.searchCriteria.next(newSC);
      })
    );
  }

  constructor(
    private firestore: AngularFirestore,
    private afAuth: AngularFireAuth,

    private appUser: CurrentUserStore,
    private uniStore: UniversitiesStore,

    private errorHandler: GlobalErrorHandler,
    private format: FormatService,
    protected resetter: StoreResetter
  ) {
    super(resetter);
  }

  protected systemsToActivate(): Observable<any> {
    return this.fillStore();
  }

  protected async resetStore() {
    this.searchCriteria.next(this.emptySearchCriteria);
  }

  fillStore() {
    return this.appUser.user$.pipe(
      filter((user) => !!user),
      switchMap((user) => {
        if (user?.latestSearchCriteria) {
          return this.nextOnSearchCriteria(
            user.latestSearchCriteria as SearchCriteria
          ).pipe(tap(() => this.isReady.next(true)));
        }
        return of("");
      })
    );
  }

  /** Adds criteria to search */
  public updateCriteriaInStore(newCriteria: SearchCriteria): Promise<void> {
    return firstValueFrom(
      this.searchCriteria$.pipe(
        take(1),
        switchMap((currentSC) => {
          for (const [criterion, value] of Object.entries(newCriteria)) {
            currentSC[criterion] = value;
          }
          return this.nextOnSearchCriteria(currentSC);
        })
      )
    );
  }

  public async updateCriteriaOnDatabase(): Promise<void> {
    this.afAuth.user.pipe(
      tap((user) => {
        if (!user) throw new CustomError("local/check-auth-state", "local");
      }),
      take(1),
      withLatestFrom(this.searchCriteria$),
      exhaustMap(([user, SC]) =>
        firstValueFrom(
          defer(() =>
            this.firestore
              .collection("profiles")
              .doc(user.uid)
              .collection("private")
              .doc("private")
              .update({
                latestSearchCriteria: this.format.searchCriteriaClassToDatabase(SC),
              })
          ).pipe(this.errorHandler.convertErrors("firestore"))
        )
      ),
      this.errorHandler.handleErrors()
    );
  }

  /** Fetches the lastly saved search criteria from the database */
  private fetchCriteria(uid: string): Observable<void> {
    return this.firestore
      .collection("profiles")
      .doc(uid)
      .collection("private")
      .doc("private")
      .get()
      .pipe(
        switchMap((snapshot) => {
          if (snapshot.exists) {
            const data = snapshot.data() as privateProfileFromDatabase;
            const latestSearchCriteria = this.format.searchCriteriaDatabaseToClass(
              data.latestSearchCriteria
            );

            return this.nextOnSearchCriteria(latestSearchCriteria).pipe(
              tap(() => this.isReady.next(true))
            );
          }
        }),
        this.errorHandler.convertErrors("firestore"),
        this.errorHandler.handleErrors()
      );
  }
}
