import { Injectable } from "@angular/core";
import { AngularFirestore } from "@angular/fire/firestore";

import { BehaviorSubject } from "rxjs";

import { NameService } from "@services/name/name.service";
import { AuthService } from "@services/auth/auth.service";
import { SCriteria, Criterion } from "@interfaces/search-criteria.model";
import { SearchCriteria, copyClassInstance } from "@classes/index";
import { profileFromDatabase } from "@interfaces/index";

@Injectable({
  providedIn: "root",
})
export class SearchCriteriaStore {
  private _searchCriteria = new BehaviorSubject<SearchCriteria>(
    new SearchCriteria(null, null, null, null, null, null)
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

  //UPDATE REQUIRED: CHANGE PROFILEFROMDATABASE CLASS SO THAT IT INCLUDES FIELD latestSearchCriteria
  // CREATE FUNCTION THAT UPDATES THAT FIELD ON THE DATABASE, FIND A PLACE WHERE IT SHOULD BE CALLED
  // THAT'S WHEN YOU SHOULD CREATE THAT FUNCTION SOMEHWERE IN THE APP THAT GETS RUN RIGHT BEFORE THE APP
  // IS SHUT DOWN. WHEN IT DOES SO, ALL DATA THAT NEEDS UPDATING SHOULD BE UPDATED ON DATABASE

  public async fetchCriteria(uid: string) {
    if (!uid) return console.error("No uid provided.");
    try {
      const snapshot = await this.fs.firestore
        .collection(this.name.profileCollection)
        .doc(uid)
        .get();

      if (snapshot.exists) {
        // const data = snapshot.data() as profileFromDatabase;
        // console.log("asas", data.latestSearchCriteria);
        // this._searchCriteria.next(data.latestSearchCriteria);
      } else {
        console.error();
      }
    } catch {
      console.error("tff");
    }
  }
}
