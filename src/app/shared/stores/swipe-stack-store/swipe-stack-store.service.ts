import { Injectable, OnDestroy } from "@angular/core";
import {
  AngularFirestore,
  DocumentData,
  QuerySnapshot,
} from "@angular/fire/firestore";
import { AngularFireFunctions } from "@angular/fire/functions";

import { BehaviorSubject, Observable, Subscription } from "rxjs";

import { NameService, AuthService } from "@services/index";
import { SearchCriteriaStore } from "@stores/index";
import { profileSnapshot } from "@interfaces/index";
import { SCriteria } from "@interfaces/search-criteria.model";

@Injectable({
  providedIn: "root",
})
export class SwipeStackStore {
  private _profiles = new BehaviorSubject<profileSnapshot[]>([]);
  public readonly profiles: Observable<
    profileSnapshot[]
  > = this._profiles.asObservable();

  constructor(
    private firestore: AngularFirestore,
    private name: NameService,
    private cloudFunctions: AngularFireFunctions,
    private auth: AuthService
  ) {}

  public async updateSwipeStack(searchCriteria: SCriteria) {
    const newProfiles = await this.fetchUserProfiles(searchCriteria);
    // const newProfiles = this.fake.generateProfiles(10)
    this.addToProfiles(newProfiles);
  }

  public removeProfile(profile: profileSnapshot) {
    this._profiles.next(
      this._profiles.getValue().filter((profile_) => profile_ !== profile)
    );
  }

  private addToProfiles(newProfiles: profileSnapshot[]) {
    this._profiles.next(this._profiles.getValue().concat(newProfiles));
  }

  private async fetchUserIDs(searchCriteria: SCriteria): Promise<string[]> {
    let fetchedIDs: string[];
    // const userID: string = this.auth.getUserID()
    // RANDOM USER ID USER FOR NOW
    const IDsnapshot: QuerySnapshot<DocumentData> = await this.firestore.firestore
      .collection("profiles")
      .limit(1)
      .get();
    const userID: string = IDsnapshot.docs[0].id;
    console.log("userID used:", userID);
    const generateSwipeStack = this.cloudFunctions.httpsCallable(
      "generateSwipeStack"
    );
    await generateSwipeStack({
      ID: userID,
      searchCriteria: searchCriteria ?? {},
    })
      .toPromise()
      .then((result) => {
        fetchedIDs = result.IDs;
      });
    return fetchedIDs;
  }

  private async fetchUserProfiles(
    searchCriteria: SCriteria
  ): Promise<profileSnapshot[]> {
    const userIDs = await this.fetchUserIDs(searchCriteria);
    const userProfiles: profileSnapshot[] = await Promise.all(
      userIDs.map(async (userID) => {
        const snapshot = await this.firestore
          .collection(this.name.profileCollection)
          .doc(userID)
          .get()
          .toPromise();
        return snapshot;
      })
    );
    console.log("Profiles for swipe stack successfuly fetched.");
    return userProfiles;
  }
}
