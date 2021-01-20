import { Injectable } from "@angular/core";
import { AngularFirestore } from "@angular/fire/firestore";
import { AngularFireFunctions } from "@angular/fire/functions";

import { BehaviorSubject, Observable } from "rxjs";

import { NameService, FormatService } from "@services/index";
import { Profile, SearchCriteria } from "@classes/index";
import { SearchCriteriaStore } from "@stores/search-criteria-store/search-criteria-store.service";
import { SwipeOutcomeStore } from "@stores/swipe-outcome-store/swipe-outcome-store.service";
import {
  generateSwipeStackResponse,
  generateSwipeStackRequest,
  profileFromDatabase,
} from "@interfaces/index";

@Injectable({
  providedIn: "root",
})
export class SwipeStackStore {
  private _profiles: BehaviorSubject<Profile[]>;
  public readonly profiles: Observable<Profile[]>;

  constructor(
    private firestore: AngularFirestore,
    private name: NameService,
    private afFunctions: AngularFireFunctions,
    private format: FormatService,
    private SCstore: SearchCriteriaStore,
    private swipeOutcomeStore: SwipeOutcomeStore
  ) {
    this._profiles = new BehaviorSubject<Profile[]>([]);
    this.profiles = this._profiles.asObservable();
  }

  /** Initializes the store by adding new profiles to the queue (which should be empty at this point)
   * returns uid so that store initializations can be chained
   */
  public async initializeStore(uid: string): Promise<string> {
    let searchCriteria: SearchCriteria;
    this.SCstore.searchCriteria.subscribe((SC) => (searchCriteria = SC)).unsubscribe();
    await this.addToSwipeStackQueue(searchCriteria);

    console.log("SwipeStackStore initialized.");
    return uid;
  }

  /** Adds profiles to the queue a.k.a. beginning of Profiles array */
  public async addToSwipeStackQueue(searchCriteria: SearchCriteria) {
    if (!searchCriteria) {
      console.error("No SC provided");
      return;
    }
    const uids = await this.fetchUIDs(searchCriteria);
    const newProfiles = await this.fetchProfiles(uids);
    this.addToBottom(newProfiles);
  }

  /** Removes a specific profile from the stack*/
  public removeProfile(profile: Profile) {
    this._profiles.next(
      this._profiles.getValue().filter((profile_) => profile_.uid !== profile.uid)
    );
  }

  /** Adds profiles to the bottom of the swipe stack a.k.a. the queue */
  private addToBottom(newProfiles: Profile[]) {
    this._profiles.next(newProfiles.concat(this._profiles.getValue()));
  }

  /** Gets the uids generated by the swipe stack generation algorithm */
  private async fetchUIDs(SC: SearchCriteria): Promise<string[]> {
    if (!SC) {
      console.error("No SC or uid provided.");
      return;
    }
    const searchCriteria = this.format.searchCriteriaClassToDatabase(SC);
    const requestData: generateSwipeStackRequest = { searchCriteria };
    const responseData = (await this.afFunctions
      .httpsCallable("generateSwipeStack")(requestData)
      .toPromise()) as generateSwipeStackResponse;

    console.log(responseData);
    this.swipeOutcomeStore.addToSwipeAnswers(responseData.users);

    return responseData.users.map((user) => user.uid);
  }

  /** Gets data from profile docs from an array of uids */
  private async fetchProfiles(uids: string[]): Promise<Profile[]> {
    if (!uids) {
      console.error("No uids provided.");
      return;
    }

    const snapshots = await Promise.all(
      uids.map(async (userID) => {
        const snapshot = await this.firestore
          .collection(this.name.profileCollection)
          .doc(userID)
          .get()
          .toPromise();
        return snapshot;
      })
    );

    const profiles: Profile[] = snapshots.map((snap) => {
      if (!snap.exists) return;
      const data = snap.data() as profileFromDatabase;
      return this.format.profileDatabaseToClass(snap.id, data);
    });

    return profiles;
  }
}
