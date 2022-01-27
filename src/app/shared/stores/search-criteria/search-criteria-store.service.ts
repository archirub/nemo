import { Injectable } from "@angular/core";
import { AngularFireAuth } from "@angular/fire/auth";
import { AngularFirestore } from "@angular/fire/firestore";

import { BehaviorSubject, defer, firstValueFrom, Observable } from "rxjs";
import {
  distinctUntilChanged,
  exhaustMap,
  filter,
  first,
  map,
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

@Injectable({
  providedIn: "root",
})
export class SearchCriteriaStore extends AbstractStoreService {
  private searchCriteria = new BehaviorSubject<SearchCriteria>(this.emptySearchCriteria);
  private isReady = new BehaviorSubject<boolean>(false);

  searchCriteria$ = this.searchCriteria.asObservable();
  isReady$ = this.isReady.asObservable().pipe(distinctUntilChanged());

  get emptySearchCriteria() {
    return new SearchCriteria({});
  }

  constructor(
    private firestore: AngularFirestore,
    private afAuth: AngularFireAuth,

    private appUser: CurrentUserStore,

    private errorHandler: GlobalErrorHandler,
    private format: FormatService,
    protected resetter: StoreResetter
  ) {
    super(resetter);
  }

  protected systemsToActivate(): Observable<any> {
    return this.fillStore();
  }

  protected resetStore() {
    this.searchCriteria.next(this.emptySearchCriteria);
    console.log("search criteria store reset.");
  }

  fillStore() {
    return this.appUser.user$.pipe(
      filter((user) => !!user),
      map((user) => {
        if (user?.latestSearchCriteria) {
          this.searchCriteria.next(user.latestSearchCriteria as SearchCriteria);
          this.isReady.next(true);
        }
      })
    );
  }

  /** Adds criteria to search */
  public updateCriteriaInStore(newCriteria: SearchCriteria): Promise<void> {
    return firstValueFrom(
      this.searchCriteria$.pipe(
        take(1),
        map((currentSC) => {
          for (const [criterion, value] of Object.entries(newCriteria)) {
            currentSC[criterion] = value;
          }
          this.searchCriteria.next(currentSC);
        })
      )
    );
  }

  public async updateCriteriaOnDatabase(): Promise<void> {
    this.afAuth.user.pipe(
      tap((user) => {
        if (!user) throw new CustomError("local/check-auth-state", "local");
      }),
      first(),
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
        map((snapshot) => {
          if (snapshot.exists) {
            const data = snapshot.data() as privateProfileFromDatabase;
            const latestSearchCriteria = this.format.searchCriteriaDatabaseToClass(
              data.latestSearchCriteria
            );

            this.searchCriteria.next(latestSearchCriteria);
            this.isReady.next(true);
          }
        }),
        this.errorHandler.convertErrors("firestore"),
        this.errorHandler.handleErrors()
      );
  }
}
