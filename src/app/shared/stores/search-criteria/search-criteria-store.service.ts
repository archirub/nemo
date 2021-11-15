import { Injectable } from "@angular/core";
import { AngularFireAuth } from "@angular/fire/auth";
import { AngularFirestore } from "@angular/fire/firestore";

import { BehaviorSubject, firstValueFrom, Observable } from "rxjs";
import { distinctUntilChanged, exhaustMap, filter, map, take } from "rxjs/operators";

import { CurrentUserStore } from "@stores/current-user/current-user-store.service";
import { FormatService } from "@services/format/format.service";

import { SearchCriteria } from "@classes/index";
import { privateProfileFromDatabase } from "@interfaces/index";

@Injectable({
  providedIn: "root",
})
export class SearchCriteriaStore {
  private searchCriteria = new BehaviorSubject<SearchCriteria>(this.emptySearchCriteria);
  private isReady = new BehaviorSubject<boolean>(false);

  searchCriteria$ = this.searchCriteria.asObservable();
  isReady$ = this.isReady.asObservable().pipe(distinctUntilChanged());

  activateStore$ = this.activateStore();

  get emptySearchCriteria() {
    return new SearchCriteria({});
  }

  constructor(
    private firestore: AngularFirestore,
    private format: FormatService,
    private afAuth: AngularFireAuth,
    private appUser: CurrentUserStore
  ) {}

  private activateStore() {
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
    const user = await this.afAuth.currentUser;

    if (!user) return console.log("no user");

    return firstValueFrom(
      this.searchCriteria$.pipe(
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
        })
      );
  }

  resetStore() {
    this.searchCriteria.next(this.emptySearchCriteria);
  }
}
