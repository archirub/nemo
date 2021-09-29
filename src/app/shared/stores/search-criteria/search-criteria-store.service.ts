import { Injectable } from "@angular/core";
import { AngularFirestore } from "@angular/fire/firestore";

import { BehaviorSubject, forkJoin, from, Observable } from "rxjs";

import { searchCriteria, Criterion } from "@interfaces/search-criteria.model";
import { SearchCriteria, copyClassInstance } from "@classes/index";
import { privateProfileFromDatabase, profileFromDatabase } from "@interfaces/index";
import { FormatService } from "@services/format/format.service";
import {
  distinctUntilChanged,
  exhaustMap,
  filter,
  map,
  take,
  tap,
  withLatestFrom,
} from "rxjs/operators";
import { AngularFireAuth } from "@angular/fire/auth";
import { CurrentUserStore } from "@stores/current-user/current-user-store.service";

@Injectable({
  providedIn: "root",
})
export class SearchCriteriaStore {
  private searchCriteria: BehaviorSubject<SearchCriteria>;
  public readonly searchCriteria$: Observable<SearchCriteria>;

  private isReady = new BehaviorSubject<boolean>(false);
  public isReady$ = this.isReady.asObservable().pipe(distinctUntilChanged());

  constructor(
    private firestore: AngularFirestore,
    private format: FormatService,
    private afAuth: AngularFireAuth,
    private appUser: CurrentUserStore
  ) {
    this.searchCriteria = new BehaviorSubject<SearchCriteria>(this.emptySearchCriteria());
    this.searchCriteria$ = this.searchCriteria.asObservable();
  }

  public activateStore() {
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

  resetStore() {
    this.searchCriteria.next(this.emptySearchCriteria());
  }

  /** Adds criteria to search */
  public updateCriteriaInStore(newCriteria: SearchCriteria): Promise<void> {
    return this.searchCriteria$
      .pipe(
        take(1),
        map((currentSC) => {
          for (const [criterion, value] of Object.entries(newCriteria)) {
            currentSC[criterion] = value;
          }
          this.searchCriteria.next(currentSC);
        })
      )
      .toPromise();
  }

  public async updateCriteriaOnDatabase(): Promise<void> {
    const user = await this.afAuth.currentUser;

    if (!user) return console.log("no user");

    return this.searchCriteria$
      .pipe(
        take(1),
        exhaustMap((SC) =>
          this.firestore
            .collection("profiles")
            .doc(user.uid)
            .collection("private")
            .doc("private")
            .update({
              latestSearchCriteria: this.format.searchCriteriaClassToDatabase(SC),
            })
        )
      )
      .toPromise();
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
        })
      );
  }

  private emptySearchCriteria() {
    return new SearchCriteria({});
  }
}
