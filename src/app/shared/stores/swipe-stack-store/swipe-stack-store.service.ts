import { Injectable } from "@angular/core";
import { AngularFirestore, DocumentSnapshot } from "@angular/fire/firestore";
import { AngularFireFunctions } from "@angular/fire/functions";

import { BehaviorSubject, combineLatest, concat, forkJoin, Observable, of } from "rxjs";
import {
  concatMap,
  exhaustMap,
  filter,
  last,
  map,
  share,
  switchMap,
  take,
  tap,
  withLatestFrom,
} from "rxjs/operators";

import { FormatService } from "@services/format/format.service";
import { Profile, SearchCriteria } from "@classes/index";
// store imports written this way to avoid circular dependency
import { SwipeOutcomeStore } from "@stores/swipe-outcome-store/swipe-outcome-store.service";
import { SearchCriteriaStore } from "@stores/search-criteria-store/search-criteria-store.service";
import { generateSwipeStackResponse, profileFromDatabase } from "@interfaces/index";
import { AngularFireStorage } from "@angular/fire/storage";
// import { StackPicturesService } from "@services/pictures/stack-pictures/stack-pictures.service";

@Injectable({
  providedIn: "root",
})
export class SwipeStackStore {
  private profiles = new BehaviorSubject<Profile[]>([]);
  public readonly profiles$ = this.profiles.asObservable();

  minimumProfileCount = 4; // # of profiles in stack below which we make another request

  constructor(
    private firestore: AngularFirestore,
    private afFunctions: AngularFireFunctions,
    private afStorage: AngularFireStorage,
    private format: FormatService,
    private SCstore: SearchCriteriaStore,
    private swipeOutcomeStore: SwipeOutcomeStore // private stackPictures: StackPicturesService
  ) {}

  /**
   * Have to subscribe to this to activate the chain of logic that fills the store etc.
   */
  activateStore(): Observable<void> {
    return this.profiles$.pipe(
      filter((profiles) => profiles.length <= this.minimumProfileCount),
      withLatestFrom(this.SCstore.searchCriteria$),
      // exhaustMap is a must use here, makes sure we don't have multiple requests to fill the swipe stack
      exhaustMap(([profiles, SC]) => this.addToSwipeStackQueue(SC)),
      share()
    );
  }

  resetStore() {
    this.profiles.next([]);
  }

  public managePictures(profiles: Profile[]): Observable<void> {
    const pictureDownloads$ = profiles.map((p) => this.downloadPictures(p));
    return concat(...pictureDownloads$).pipe(last());
  }

  // not good because only sends pictures of a given profile once they are all downloaded,
  // but best I can do for now
  public downloadPictures(profile: Profile) {
    const pictureUrls$ = Array.from({ length: profile.pictureCount }).map((v, index) =>
      this.getUrl(profile.uid, index)
    );
    0;
    return forkJoin(pictureUrls$).pipe(
      concatMap((pictureUrls) => this.addUrls(pictureUrls, profile.uid))
    );
  }

  private getUrl(uid: string, pictureIndex: number): Observable<string> {
    return this.afStorage
      .ref("profilePictures/" + uid + "/" + pictureIndex)
      .getDownloadURL()
      .pipe(take(1));
  }

  private addUrls(urls: string[], uid: string): Observable<void> {
    return this.profiles$.pipe(
      take(1),
      tap((profiles) => {
        const userIndex = profiles.map((p) => p.uid).indexOf(uid);
        profiles[userIndex].pictureUrls = urls;

        this.profiles.next(profiles);
      }),
      map(() => null)
    );
  }

  /** Adds profiles to the queue a.k.a. beginning of Profiles array */
  public addToSwipeStackQueue(SC: SearchCriteria) {
    return this.fetchUIDs(SC).pipe(
      //using exhaustMap s.t. other requests are not listened to while profiles are being fetched
      // this is because it is a costly operation w.r.t backened and money-wise, and that it is most likely
      // a mistake
      exhaustMap((uids) => this.fetchProfiles(uids)),
      concatMap((profiles) => this.addToQueue(profiles)),
      // THIS NEXT ONE IS WHY IT CONSOLE LOGS MANY TIMES STORE INITIALISED, AS THIS ONE EMITS
      // ONCE FOR EVERY USER IT MANAGES THE PICTURES OF, HENCE EVERYTHING IS WORKING FINE,
      // THE LOG JUST BECOMES MISLEADING DUE TO THIS SETUP
      concatMap((profiles) => this.managePictures(profiles))
    );
  }

  /** Removes a specific profile from the stack*/
  public removeProfile(profile: Profile): Observable<void | string[]> {
    return this.profiles$.pipe(
      take(1),
      map((profiles) => {
        if (!profiles) return;
        let profileToRemove: Profile;
        this.profiles.next(
          profiles.filter((p) => {
            if (p.uid !== profile.uid) return true;
            else {
              profileToRemove = p;
              return false;
            }
          })
        );
        return profileToRemove.pictureUrls;
      }),
      tap((urls) => {
        if (!Array.isArray(urls)) return;
        urls.forEach((url) => {
          URL.revokeObjectURL(url);
        });
      })
    );
  }

  /** Adds profiles to the bottom of the swipe stack a.k.a. the queue
   * Returns an observable of the new profiles
   */
  private addToQueue(newProfiles: Profile[]): Observable<Profile[]> {
    return this.profiles$.pipe(
      take(1),
      tap((profiles) => this.profiles.next(newProfiles.concat(profiles))),
      concatMap(() => of(newProfiles)) // makes it so that the observable returned gives an array of the new profiles
    );
  }

  /** Gets the uids generated by the swipe stack generation algorithm */
  private fetchUIDs(SC: SearchCriteria): Observable<string[]> {
    return of(this.format.searchCriteriaClassToDatabase(SC)).pipe(
      map((SC) => {
        return { SearchCriteria: SC };
      }),
      exhaustMap(
        (request) =>
          this.afFunctions.httpsCallable("generateSwipeStack")(
            request
          ) as Observable<generateSwipeStackResponse>
      ),
      tap((response) => this.swipeOutcomeStore.addToSwipeAnswers(response.users)),
      map((response) => response.users.map((u) => u.uid))
    );
  }

  /** Gets data from profile docs from an array of uids */
  private fetchProfiles(uids: string[]): Observable<Profile[]> {
    return forkJoin(
      uids.map(
        (uid) =>
          this.firestore.collection("profiles").doc(uid).get() as Observable<
            DocumentSnapshot<profileFromDatabase>
          >
      )
    ).pipe(
      // formating profiles and filtering out those which are null
      map((profileSnapshots) =>
        profileSnapshots
          .map((s) => {
            if (!s.exists) return;
            const data = s.data() as profileFromDatabase;
            return this.format.profileDatabaseToClass(s.id, data);
          })
          .filter((s) => s)
      )
    );
  }
}
