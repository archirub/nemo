import { Injectable } from "@angular/core";
import { AngularFirestore } from "@angular/fire/firestore";

import { BehaviorSubject, Observable } from "rxjs";

import { searchCriteria, Criterion } from "@interfaces/search-criteria.model";
import { SearchCriteria, copyClassInstance } from "@classes/index";
import { privateProfileFromDatabase, profileFromDatabase } from "@interfaces/index";
import { FormatService } from "@services/index";

@Injectable({
  providedIn: "root",
})
export class SearchCriteriaStore {
  private _searchCriteria: BehaviorSubject<SearchCriteria>;
  public readonly searchCriteria: Observable<SearchCriteria>;

  constructor(private fs: AngularFirestore, private format: FormatService) {
    this._searchCriteria = new BehaviorSubject<SearchCriteria>(
      this.emptySearchCriteria()
    );
    this.searchCriteria = this._searchCriteria.asObservable();
  }

  public async initializeStore(uid: string) {
    if (!uid) return console.error("No uid provided.");
    await this.fetchCriteria(uid);
  }

  public initalizeThroughCurrentUserStore(SC: SearchCriteria) {
    if (!SC) return console.error("No search criteria provided.");
    this.addCriteria(SC);
  }

  /** Adds criteria to search */
  public addCriteria(newCriteria: SearchCriteria): void {
    let currentCriteria: SearchCriteria = this._searchCriteria.getValue();

    for (const [criterion, value] of Object.entries(newCriteria)) {
      currentCriteria[criterion] = value;
    }
    this._searchCriteria.next(currentCriteria);
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
  private async fetchCriteria(uid: string) {
    if (!uid) return console.error("No uid provided.");
    try {
      const snapshot = await this.fs.firestore
        .collection("profiles")
        .doc(uid)
        .collection("private")
        .doc("private")
        .get();

      if (snapshot.exists) {
        const data = snapshot.data() as privateProfileFromDatabase;
        const latestSearchCriteria = this.format.searchCriteriaDatabaseToClass(
          data.latestSearchCriteria
        );
        this._searchCriteria.next(latestSearchCriteria);
      } else {
        console.error();
      }
    } catch {
      console.error("tff");
    }
  }

  private emptySearchCriteria() {
    return new SearchCriteria({});
  }
}
