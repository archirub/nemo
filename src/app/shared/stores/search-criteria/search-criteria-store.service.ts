import { Injectable } from "@angular/core";
import { AngularFirestore } from "@angular/fire/compat/firestore";

import { BehaviorSubject, forkJoin, from, Observable } from "rxjs";

import { searchCriteria, Criterion } from "@interfaces/search-criteria.model";
import { SearchCriteria, copyClassInstance } from "@classes/index";
import { privateProfileFromDatabase, profileFromDatabase } from "@interfaces/index";
import { FormatService } from "@services/format/format.service";
import { exhaustMap, filter, map, take, tap, withLatestFrom } from "rxjs/operators";
import { AngularFireAuth } from "@angular/fire/compat/auth";

@Injectable({
  providedIn: "root",
})
export class SearchCriteriaStore {
  private searchCriteria: BehaviorSubject<SearchCriteria>;
  public readonly searchCriteria$: Observable<SearchCriteria>;

  constructor(
    private firestore: AngularFirestore,
    private format: FormatService,
    private afAuth: AngularFireAuth
  ) {
    this.searchCriteria = new BehaviorSubject<SearchCriteria>(this.emptySearchCriteria());
    this.searchCriteria$ = this.searchCriteria.asObservable();
  }

  public async initializeStore(uid: string) {
    if (!uid) return console.error("No uid provided.");
    await this.fetchCriteria(uid).toPromise();
  }

  resetStore() {
    this.searchCriteria.next(this.emptySearchCriteria());
  }

  public async initalizeThroughCurrentUserStore(SC: SearchCriteria) {
    if (!SC) return console.error("No search criteria provided.");
    await this.updateCriteriaStore(SC);
  }

  /** Adds criteria to search */
  public updateCriteriaStore(newCriteria: SearchCriteria): Promise<void> {
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

  /** Removes all criterion listed in array */
  // private removeCriteria(criteria: Criterion[]) {
  //   const currentCriteria: SearchCriteria = this._searchCriteria.getValue();

  //   criteria.forEach((criterion) => {
  //     currentCriteria[criterion] = null;
  //   });
  //   this._searchCriteria.next(currentCriteria);
  // }

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
          }
        })
      );
  }

  private emptySearchCriteria() {
    return new SearchCriteria({});
  }
}
