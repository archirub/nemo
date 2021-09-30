import { uidChoiceMap } from "./../../interfaces/swipe-choice.model";
import { Injectable } from "@angular/core";
import { AngularFirestore, DocumentSnapshot } from "@angular/fire/firestore";
import { AngularFireFunctions } from "@angular/fire/functions";

import { BehaviorSubject, combineLatest, concat, forkJoin, Observable, of } from "rxjs";
import {
  concatMap,
  distinctUntilChanged,
  exhaustMap,
  filter,
  first,
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
import { SwipeOutcomeStore } from "@stores/swipe-outcome/swipe-outcome-store.service";
import { SearchCriteriaStore } from "@stores/search-criteria/search-criteria-store.service";
import {
  generateSwipeStackRequest,
  generateSwipeStackResponse,
  profileFromDatabase,
} from "@interfaces/index";
import { AngularFireStorage } from "@angular/fire/storage";
// import { StackPicturesService } from "@services/pictures/stack-pictures/stack-pictures.service";

// loading is for when there is no one in the stack but we are fetching
// empty is for the stack has been fetched and no one was found
// filled is for when there is someone in the stack
export type StackState = "init" | "filled" | "loading" | "empty";
@Injectable({
  providedIn: "root",
})
export class SwipeStackStore {
  private profiles = new BehaviorSubject<Profile[]>([]);
  public readonly profiles$ = this.profiles.asObservable();

  MIN_PROFILE_COUNT = 4; // # of profiles in stack below which we make another request

  private stackState = new BehaviorSubject<StackState>("init");
  public stackState$ = this.stackState.asObservable().pipe(distinctUntilChanged());

  private isReady = new BehaviorSubject<boolean>(false);
  public isReady$ = this.isReady.asObservable().pipe(distinctUntilChanged());

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
  activateStore(): Observable<any> {
    return this.profiles$.pipe(
      map((profiles) => profiles.length),
      concatMap((count) => this.updateStackState(count)),
      this.filterBasedOnStackState(),
      filter((count) => count <= this.MIN_PROFILE_COUNT),
      switchMap(() => this.SCstore.searchCriteria$.pipe(first())), // using switchMap instead of withLatestFrom as SC might still be undefined at that point so we want to wait for it to have a value (which withLatestFrom doesn't do)
      // exhaustMap is a must use here, makes sure we don't have multiple requests to fill the swipe stack
      exhaustMap((SC) => this.addToSwipeStackQueue(SC)),
      tap(() => this.isReady.next(true)),
      share()
    );
  }

  filterBasedOnStackState() {
    return (source: Observable<number>) => {
      return source.pipe(
        withLatestFrom(this.stackState$),
        filter(([profileCount, stackState]) => stackState !== "empty"),
        map(([profileCount, stackState]) => profileCount)
      );
    };
  }

  updateStackState(profilesCount: number): Observable<number> {
    return this.stackState$.pipe(
      first(),
      map((currentState) => {
        if (currentState === "loading" && profilesCount > 0)
          return this.stackState.next("filled");
        if (currentState === "loading" && profilesCount === 0)
          return this.stackState.next("empty");
        if (currentState === "filled" && profilesCount === 0)
          return this.stackState.next("loading");
      }),
      map(() => profilesCount)
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
    return this.afStorage
      .ref("/profilePictures/" + profile.uid)
      .listAll()
      .pipe(
        exhaustMap((list) => forkJoin(list.items.map((i) => i.getDownloadURL()))),
        exhaustMap((urls) => this.addUrls(urls, profile.uid))
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
      map((profiles) => [profiles, profiles.map((p) => p.uid).indexOf(uid)]),
      filter((array) => array[1] !== -1),
      take(1),
      tap((array: [Profile[], number]) => {
        array[0][array[1]].pictureUrls = urls;

        this.profiles.next(array[0]);
      }),
      map(() => null)
    );
  }

  /** Adds profiles to the queue a.k.a. beginning of Profiles array */
  public addToSwipeStackQueue(SC: SearchCriteria) {
    this.stackState.next("loading");
    return this.fetchUIDs(SC).pipe(
      //using exhaustMap s.t. other requests are not listened to while profiles are being fetched
      // this is because it is a costly operation w.r.t backened and money-wise
      exhaustMap((uids) => this.fetchProfiles(uids)),

      concatMap((profiles) => this.addToQueue(profiles)),

      // THIS NEXT ONE IS WHY IT CONSOLE LOGS MANY TIMES STORE INITIALISED, AS THIS ONE EMITS
      // ONCE FOR EVERY USER IT MANAGES THE PICTURES OF, HENCE EVERYTHING IS WORKING FINE,
      // THE LOG JUST BECOMES MISLEADING DUE TO THIS SETUP
      concatMap((profiles) =>
        profiles.length > 0 ? this.managePictures(profiles) : of(null)
      )
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
        const request: generateSwipeStackRequest = { searchCriteria: SC };
        return request;
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
    if (uids.length < 1) return of([]);
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
