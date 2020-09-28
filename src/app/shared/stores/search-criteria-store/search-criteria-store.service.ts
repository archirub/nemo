import { Injectable } from "@angular/core";
import { AngularFirestore } from "@angular/fire/firestore";

import { BehaviorSubject } from "rxjs";

import { NameService } from "@services/name/name.service";
import { AuthService } from "@services/auth/auth.service";
import { SCriteria, Criterion } from "@interfaces/search-criteria.model";
import { SearchCriteria, copyClassInstance } from "@classes/index";

@Injectable({
  providedIn: "root",
})
export class SearchCriteriaStore {
  private _searchCriteria = new BehaviorSubject<SearchCriteria>(
    new SearchCriteria({})
  );

  public readonly searchCriteria = this._searchCriteria.asObservable();

  constructor(
    private fs: AngularFirestore,
    private name: NameService,
    private auth: AuthService
  ) {}

  public addCriteria(newCriteria: SearchCriteria): void {
    let currentCriteria: SearchCriteria = copyClassInstance<SearchCriteria>(
      this._searchCriteria.getValue()
    );
    for (const [criterion, value] of Object.entries(newCriteria)) {
      currentCriteria[criterion] = value;
    }
    this._searchCriteria.next(currentCriteria);
  }

  public removeCriteria(criteria: Criterion[]) {
    let currentCriteria: SearchCriteria = copyClassInstance<SearchCriteria>(
      this._searchCriteria.getValue()
    );
    criteria.forEach((criterion) => {
      delete currentCriteria[criterion];
    });
    this._searchCriteria.next(currentCriteria);
  }

  public async fetchCriteria() {
    try {
      const snapshot = await this.fs
        .collection(this.name.profileCollection)
        .doc(this.auth.userID)
        .get()
        .toPromise();
      if (snapshot.exists) {
        this._searchCriteria.next(snapshot.data().latestSearchCriteria);
      } else {
        console.error();
      }
    } catch {
      console.error();
    }
  }
}
