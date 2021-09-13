import { Injectable } from "@angular/core";
import { AngularFirestore } from "@angular/fire/compat/firestore";

import { BehaviorSubject, Observable } from "rxjs";

import { searchCriteria, Criterion } from "@interfaces/search-criteria.model";
import { SearchCriteria, copyClassInstance } from "@classes/index";
import { privateProfileFromDatabase, profileFromDatabase } from "@interfaces/index";
import { FormatService } from "@services/format/format.service";
import { map } from "rxjs/operators";

@Injectable({
  providedIn: "root",
})
export class SearchCriteriaStore {
  private searchCriteria: BehaviorSubject<SearchCriteria>;
  public readonly searchCriteria$: Observable<SearchCriteria>;

  constructor(private firestore: AngularFirestore, private format: FormatService) {
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

  public initalizeThroughCurrentUserStore(SC: SearchCriteria) {
    if (!SC) return console.error("No search criteria provided.");
    this.addCriteria(SC);
  }

  /** Adds criteria to search */
  public addCriteria(newCriteria: SearchCriteria): void {
    let currentCriteria: SearchCriteria = this.searchCriteria.getValue();

    for (const [criterion, value] of Object.entries(newCriteria)) {
      currentCriteria[criterion] = value;
    }
    this.searchCriteria.next(currentCriteria);
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
