import { Injectable } from "@angular/core";
import {
  AngularFirestore,
  DocumentData,
  QuerySnapshot,
} from "@angular/fire/firestore";
import { AngularFireFunctions } from "@angular/fire/functions";

import { BehaviorSubject, Observable } from "rxjs";

import { NameService, AuthService } from "@services/index";
import { profileSnapshot } from "@interfaces/profile";

@Injectable({
  providedIn: "root",
})
export class SwipeStackStoreService {
  private _profiles = new BehaviorSubject<profileSnapshot[]>([]);

  public readonly profiles: Observable<
    profileSnapshot[]
  > = this._profiles.asObservable();

  constructor(
    private firestore: AngularFirestore,
    private name: NameService,
    private cloudFunctions: AngularFireFunctions,
    private auth: AuthService
  ) {
    this.updateSwipeStack();
  }

  public async updateSwipeStack() {
    const newProfiles = await this.fetchUserProfiles();
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

  private async fetchUserIDs(): Promise<string[]> {
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
      searchCriteria: { university: "UCL" },
    })
      .toPromise()
      .then((result) => {
        fetchedIDs = result.IDs;
      });
    return fetchedIDs;
  }

  private async fetchUserProfiles(): Promise<profileSnapshot[]> {
    const userIDs = await this.fetchUserIDs();
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
