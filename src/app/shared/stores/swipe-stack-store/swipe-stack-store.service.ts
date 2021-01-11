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
import { take } from "rxjs/operators";

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
    // const userID: string = await this.auth.fetchUserID();
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

    //THE LOGGED ERROR "INTERNAL ERROR" COMES FROM HERE
    // it comes from calling the generateSwipeStack function
    // it means that there is an error happening internally that prevents the cloud function
    // from normally running, so maybe it is the time for you to console.log shit and do error
    // handling of your cloud function, which will help you fix the error but is also completely
    // necessary in the long term
    console.log("current generateSWipeStack object passed: ", {
      ID: "oY6HiUHmUvcKbFQQnb88t3U4Zew1",
      searchCriteria: {},
    });
    // const result = await generateSwipeStack({})
    //   .pipe(take(1))
    //   // .subscribe((result) => {
    //   //   fetchedIDs = result.IDs;
    //   //   console.log("fetched:", fetchedIDs);
    //   // });
    //   .toPromise()
    //   .then((response) => {
    //     console.log(response);
    //     // fetchedIDs = response.IDs;
    //     // console.log("fetched:", fetchedIDs);
    //   });

    console.log("cdq!");

    // fetchedIDs = [
    //   "5eobZByer0ezLcjBUdqkSC7ldIJ3",
    //   "AZzt5mm1JdaQcycKhzzQWFy8L7A3",
    // ];
    return fetchedIDs;
  }

  private async fetchUserProfiles(
    searchCriteria: SCriteria
  ): Promise<profileSnapshot[]> {
    const userIDs = (await this.fetchUserIDs(searchCriteria)) || [];
    console.log("userIDs of fetched users:", userIDs);
    // const userIDs = [
    //   "5eobZByer0ezLcjBUdqkSC7ldIJ3",
    //   "AZzt5mm1JdaQcycKhzzQWFy8L7A3",
    // ];
    const userProfiles: profileSnapshot[] = await Promise.all(
      userIDs.map(async (userID) => {
        console.log("userID of fetched user:", userID);
        const snapshot = await this.firestore
          .collection(this.name.profileCollection)
          .doc(userID)
          .get()
          .toPromise();
        return snapshot;
      })
    );
    console.log(
      "Profiles for swipe stack successfuly fetched.",
      userProfiles.map((prof) => prof.data())
    );
    return userProfiles;
  }
}
