import { Injectable, QueryList } from "@angular/core";
import { AngularFirestore, DocumentSnapshot } from "@angular/fire/firestore";
import { AngularFireFunctions } from "@angular/fire/functions";
import { AngularFireStorage } from "@angular/fire/storage";

import { BehaviorSubject, defer, EMPTY, forkJoin, merge, Observable, of } from "rxjs";
import {
  concatMap,
  distinctUntilChanged,
  exhaustMap,
  filter,
  first,
  map,
  pairwise,
  share,
  startWith,
  switchMap,
  take,
  tap,
  throttle,
  withLatestFrom,
} from "rxjs/operators";
import { isEqual, cloneDeep } from "lodash";

import { ProfileCardComponent } from "@components/profile-card/profile-card.component";

import { SwipeOutcomeStore } from "@stores/swipe-outcome/swipe-outcome-store.service";
import { SearchCriteriaStore } from "@stores/search-criteria/search-criteria-store.service";
import { FormatService } from "@services/format/format.service";

import { Profile, SearchCriteria } from "@classes/index";
import {
  generateSwipeStackRequest,
  generateSwipeStackResponse,
  profileFromDatabase,
} from "@interfaces/index";
import { GlobalErrorHandler } from "@services/errors/global-error-handler.service";

// loading is for when there is no one in the stack but we are fetching
// empty is for the stack has been fetched and no one was found
// filled is for when there is someone in the stack
export type StackState = "init" | "filled" | "loading" | "empty";

export type PictureQueue = Array<{ uid: string; pictureIndex: number }>;
@Injectable({
  providedIn: "root",
})
export class SwipeStackStore {
  private readonly MIN_PROFILE_COUNT = 4; // # of profiles in profiles$ below which we make another request
  private readonly MIN_RENDERED_COUNT = 2; // min # of profiles in profilesToRender$
  private readonly MAX_RENDERED_COUNT = 5; // max # of profiles in profilesToRender$
  picturePriority = [
    // format: [profileIndex (in profilesToRender$), pictureIndex (in pictureUrls)]
    [[0, 0]], // batch 1
    [
      [0, 1],
      [0, 2],
      [1, 0],
      [1, 1],
    ], // batch 2
    [
      [2, 0],
      [3, 0],
      [4, 0],
    ], // batch 3
  ];

  private profiles = new BehaviorSubject<Profile[]>([]);
  private profilesToRender = new BehaviorSubject<Profile[]>([]); // for performance - this is a subset of profiles, and contains just profiles to render on the page
  private isReady = new BehaviorSubject<boolean>(false);
  private stackState = new BehaviorSubject<StackState>("init");

  profiles$ = this.profiles.asObservable();
  profilesToRender$ = this.profilesToRender.asObservable();
  isReady$ = this.isReady.asObservable().pipe(distinctUntilChanged());
  stackState$ = this.stackState.asObservable().pipe(distinctUntilChanged());

  activateStore$ = this.activateStore();

  constructor(
    private firestore: AngularFirestore,
    private afFunctions: AngularFireFunctions,
    private afStorage: AngularFireStorage,

    private SCstore: SearchCriteriaStore,
    private swipeOutcomeStore: SwipeOutcomeStore,

    private errorHandler: GlobalErrorHandler,
    private format: FormatService
  ) {}

  /**
   * Have to subscribe to this to activate the chain of logic that fills the store etc.
   */
  private activateStore(): Observable<any> {
    return merge(
      this.manageSwipeStack(),
      this.manageRenderedProfiles(),
      this.managePictureQueue(),
      this.manageStoreReadiness()
    ).pipe(share());
  }

  manageSwipeStack() {
    return this.profiles$.pipe(
      this.filterUnchangedLength(),
      map((profiles) => profiles.length),
      concatMap((count) => this.updateStackState(count)),
      this.filterBasedOnStackState(),
      filter((count) => count <= this.MIN_PROFILE_COUNT),
      switchMap(() => this.SCstore.searchCriteria$.pipe(first())), // using switchMap instead of withLatestFrom as SC might still be undefined at that point so we want to wait for it to have a value (which withLatestFrom doesn't do)
      exhaustMap((SC) => this.addToSwipeStackQueue(SC)) // exhaustMap is a must use here, makes sure we don't have multiple requests to fill the swipe stack
    );
  }

  manageStoreReadiness() {
    // waits for the swipe stack to have at least one profile and for the first picture of first profile to be loaded
    return this.profilesToRender$.pipe(
      filter(
        (profiles) =>
          Array.isArray(profiles) && profiles.length > 0 && !!profiles[0].pictureUrls[0]
      ),
      first(),

      tap((profiles) => console.log("swipe stack is ready:", profiles)),
      tap(() => this.isReady.next(true))
    );
  }

  manageRenderedProfiles() {
    return this.profiles$.pipe(
      withLatestFrom(this.profilesToRender$),
      filter(([allProfiles, profilesToRender]) => {
        if (!Array.isArray(allProfiles) || !Array.isArray(profilesToRender)) return false;
        if (profilesToRender.length === 0) return true;
        return !isEqual(
          profilesToRender.map((p) => [p.uid, ...p.pictureUrls]),
          allProfiles
            .slice(0, profilesToRender.length)
            .map((p) => [p.uid, ...p.pictureUrls])
        );
        //  return !isEqual(profilesToRender, allProfiles.slice(0, profilesToRender.length));
      }),
      // this deals with deleting rendered profiles that have been removed from allProfiles due
      // to user action (so only looks at the front of the array and operates in a very non-general way)
      map(([allProfiles, profilesToRender]) => {
        if (profilesToRender.length !== 0) {
          // skips this step if renderer contains no profiles
          const lastuid = allProfiles[0].uid;
          let indexInRendered = profilesToRender.length - 1; // default value everyone will be removed if user is not found
          for (const [index, p] of profilesToRender.entries()) {
            if (p.uid === lastuid) {
              indexInRendered = index;
              break;
            }
          }
          profilesToRender.splice(0, indexInRendered);
        }

        return [allProfiles, profilesToRender];
      }),

      // deals with:
      // - refilling the renderer periodically when the number of profiles it holds falls below a given threshold
      // - updating the profiles in profilesToRender$ at this point with the version in profiles$ in case their pictureUrls array has been updated in between
      // (indeed the changes in pictureUrls array are made in profiles$, not in profilesToRender$)
      map(([allProfiles, profilesToRender]) => {
        // this part assumes that the items of profilesToRender are exactly the same as the first few of allProfiles in same order
        const countRendered = profilesToRender.length;
        const isBelowMin = countRendered < this.MIN_RENDERED_COUNT;

        const upperBound = isBelowMin ? this.MAX_RENDERED_COUNT : countRendered;

        profilesToRender = allProfiles.slice(0, upperBound);

        return [allProfiles, profilesToRender];
      }),
      // submits updated profilesToRender version
      tap(([allProfiles, newProfilesToRender]) =>
        // deep cloning so that their pictureUrls have different references
        // it seems like it'd be great if they did point to the same ref, as the pictureUrls
        // array in profilesToRender would be updated automatically as those in profiles get updated.
        // However, on a new emission from profiles$ due to an update in a picture array, we wouldn't
        // pass the filter above, and so the next round of picture fetching could not be started
        // as well, we wouldn't inform the subscribers of profilesToRender$ that there has been an update
        // and so for example the readiness observer would never get the info that the first pic of first profile
        // has been fetched
        this.profilesToRender.next(cloneDeep(newProfilesToRender))
      )
    );
  }

  managePictureQueue() {
    // this relies on a particular fact: that adding new urls to the profiles BehavioSubject
    // triggers profilesToRender$ to reemit, thereby making it fetch the next batch of pictures on the priority list.
    // That is: it relies on the fact that finishing to fetch a given batch triggers the fetching of the next batch
    return this.profilesToRender$.pipe(
      filter((profiles) => Array.isArray(profiles) && profiles.length > 0),
      throttle(
        (p) =>
          of(p).pipe(
            map((profiles) => {
              let toDownload: Array<[string, number]> = []; // format [uid, picture index]

              // looping through batches of priority
              for (const batch of this.picturePriority) {
                // looping through pairs of profile/picture indices in each batch
                for (const indices of batch) {
                  // collecting profile/picture indices of the batch which have no url yet
                  const profile = profiles[indices[0]];
                  if (!profile) continue;
                  const noPicture = !profile.pictureUrls[indices[1]];
                  if (noPicture) toDownload.push([profile.uid, indices[1]]);
                }

                // if there are pictures without url in this batch, then return them so that they can be downloaded
                if (toDownload.length > 0) break;
              }

              return toDownload;
            }),
            concatMap((batch) =>
              // fetching urls of batch
              forkJoin(batch.map(([uid, picIndex]) => this.getUrl(uid, picIndex))).pipe(
                // transforming to object whose shape fits the parameter of this.addPictures
                // (note: this puts an empty string for url if there isn't any corresponding url
                // there needs to be something there so that we don't attempt to fetch it everytime
                // if we already know there is something there)
                map((urls) =>
                  urls.map((url, i) => ({ uid: batch[i][0], picIndex: batch[i][1], url }))
                )
              )
            ),
            concatMap((picMaps) => this.addPictures(picMaps))
          ),
        { leading: true, trailing: true }
      )
    );
  }

  managePictureSwiping(profileCards: QueryList<ProfileCardComponent>) {
    // triggers when there is a change to the array of rendered profiles
    // (usually means a profile has been added or removed)
    return profileCards.changes.pipe(
      // listens to the user's swipping on that profile
      switchMap((list: QueryList<ProfileCardComponent>) =>
        list.first.slidesRef$.pipe(
          first(),
          switchMap((ref) =>
            ref.ionSlideWillChange.pipe(
              map((slides) => ({
                slides,
                uid: list.first.profile.uid,
                profilePictures$: list.first.profilePictures$,
              }))
            )
          )
        )
      ),
      // Gets index of new slide
      map((map) => ({
        picIndex: (map.slides.target as any)?.swiper?.realIndex as number,
        uid: map.uid,
        profilePictures$: map.profilePictures$,
      })),
      // doesn't keep going if slide is the first one
      filter((m) => typeof m.picIndex === "number" && m.picIndex > 0),
      switchMap((m) =>
        // subscribes to profile picture of that array
        m.profilePictures$.pipe(
          first(),
          switchMap((pics) => {
            const maxIndex = m.picIndex + 2; // defines how many pics forward we're loading (so here 2 pics forward)

            // array of observables, each for a diff pic, that checks whether a pic has already been fetched
            // and if not fetches it
            const addPictures$ = Array.from({ length: maxIndex + 1 })
              .map((_, i) => {
                const alreadyDownloaded =
                  typeof pics[i] === "string" && pics[i].length > 0; // checks for it not being an empty string
                if (alreadyDownloaded) return false;

                return (() => {
                  const index = i;
                  return this.getUrl(m.uid, index).pipe(
                    map((url) => (url ? { url, picIndex: index, uid: m.uid } : false))
                  );
                })();
              })
              .filter(Boolean) as Observable<
              | false
              | {
                  url: string;
                  picIndex: number;
                  uid: string;
                }
            >[]; // filters out "false" elements (a.k.a where fetching wasn't needed)
            return forkJoin(addPictures$).pipe(
              switchMap((urls) =>
                this.addPictures(
                  urls.filter(Boolean) as { url: string; picIndex: number; uid: string }[]
                )
              )
            );
          })
        )
      )
    );
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

  filterUnchangedLength() {
    return (source: Observable<Profile[]>) => {
      return source.pipe(
        startWith(""),
        pairwise(),
        filter(([prev, curr]) => prev === "" || prev.length !== curr.length),
        // filter(([prev, curr]) => !isEqual(prev, curr)),
        map(([prev, curr]) => curr as Profile[])
      );
    };
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

  // gives out an empty string if the pictureIndex doesn't exist
  private getUrl(uid: string, pictureIndex: number): Observable<string> {
    return this.afStorage
      .ref("/profilePictures/" + uid)
      .listAll()
      .pipe(
        this.errorHandler.convertErrors("firebase-storage"),
        this.errorHandler.handleErrors(),
        exhaustMap((list: firebase.default.storage.ListResult) => {
          // done this way as the items in list.items might not be in order of picture #
          const index = list.items.map((i) => i.name).indexOf(pictureIndex.toString());

          if (index === -1) return EMPTY;

          return defer(() => list.items[index].getDownloadURL()).pipe(
            this.errorHandler.convertErrors("firebase-storage"),
            this.errorHandler.handleErrors()
          );
        })
      ) as Observable<string>;
  }

  private addPictures(
    picMaps: { uid: string; picIndex: number; url: string }[]
  ): Observable<void> {
    return this.profiles$.pipe(
      first(),
      map((profiles) => {
        // loops through picture maps
        picMaps.forEach((map) => {
          // finds index of profile in profilesToRender
          const profIndex = profiles.map((p) => p.uid).indexOf(map.uid);
          if (profIndex === -1) return;

          // adds url to appropriate location in pictureUrls
          // done this strange way so that the reference to pictureUrls changes such that changes are detected in the template
          profiles[profIndex].pictureUrls = profiles[profIndex].pictureUrls.slice(0);
          profiles[profIndex].pictureUrls[map.picIndex] = map.url;
          // profiles[profIndex].pictureUrls = Object.assign(
          //   [],
          //   profiles[profIndex].pictureUrls,
          //   { [map.picIndex]: map.url }
          // );
          // profiles[profIndex].pictureUrls[map.picIndex] = map.url;
        });

        // passes the new profiles object with the new urls to the profiles BehaviorSubject
        this.profiles.next(profiles);
      })
    );
  }

  /** Adds profiles to the queue a.k.a. beginning of Profiles array */
  public addToSwipeStackQueue(SC: SearchCriteria) {
    this.stackState.next("loading");
    return this.fetchUIDs(SC).pipe(
      //using exhaustMap s.t. other requests are not listened to while profiles are being fetched
      // this is because it is a costly operation w.r.t backened and money-wise
      exhaustMap((uids) => this.fetchProfiles(uids)),

      concatMap((profiles) => this.addToQueue(profiles))
    );
  }

  /** Removes a specific profile from the stack*/
  public removeProfile(profile: Profile): Observable<void | string[]> {
    return this.profiles$.pipe(
      first(),
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
    return this.getPictureCounts(newProfiles).pipe(
      switchMap(() => this.profiles$),
      first(),
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
          this.afFunctions
            .httpsCallable("generateSwipeStack")(request)
            .pipe(
              this.errorHandler.convertErrors("cloud-functions"),
              this.errorHandler.handleErrors()
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
          this.firestore
            .collection("profiles")
            .doc(uid)
            .get()
            .pipe(
              this.errorHandler.convertErrors("firestore"),
              this.errorHandler.handleErrors()
            ) as Observable<DocumentSnapshot<profileFromDatabase>>
      )
    ).pipe(
      // formatting profiles and filtering out those which are null
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

  getPictureCounts(profiles: Profile[]): Observable<Profile[]> {
    const getPictureCounts$ = profiles.map(
      (p, i) =>
        this.afStorage
          .ref("/profilePictures/" + p.uid)
          .listAll()
          .pipe(
            first(),
            map((list) => list.items.length),
            this.errorHandler.convertErrors("firebase-storage"),
            this.errorHandler.handleErrors()
          ) as Observable<number>
    );

    return forkJoin(getPictureCounts$).pipe(
      map((pictureCounts) =>
        pictureCounts.forEach((count, i) => (profiles[i].pictureCount = count))
      ),
      map(() => profiles)
    );
  }

  resetStore() {
    this.profiles.next([]);
  }
}
