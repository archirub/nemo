import { Injectable, QueryList } from "@angular/core";
import { AngularFirestore, DocumentSnapshot } from "@angular/fire/firestore";
import { AngularFireFunctions } from "@angular/fire/functions";
import { AngularFireStorage } from "@angular/fire/storage";

import {
  BehaviorSubject,
  combineLatest,
  defer,
  forkJoin,
  merge,
  Observable,
  of,
  Subject,
} from "rxjs";
import {
  concatMap,
  delay,
  distinctUntilChanged,
  exhaustMap,
  filter,
  first,
  map,
  mapTo,
  pairwise,
  startWith,
  switchMap,
  switchMapTo,
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
import { SwipeCapService } from "./swipe-cap.service";
import { AbstractStoreService } from "@interfaces/stores.model";
import { StoreResetter } from "@services/global-state-management/store-resetter.service";
import { CurrentUserStore } from "..";
import Swiper from "swiper";
import { SwiperComponent } from "swiper/angular";

// - null is for when a state for the swipe stack hasn't been set yet
// - "initialLoading" is for the very first load. Must be distinct from "loading"
// - "filled" is for when there is someone in the stack
// - "loading" is for when there is no one in the stack but we are fetching
// - "empty" is for the stack has been fetched and no one was found
// - "cap-reached "is for when the swipe capping limit has been reached
// - "not-showing-profile" is for when the user has showProfile set to false
export type StackState =
  | null
  | "initialLoading"
  | "filled"
  | "loading"
  | "empty"
  | "cap-reached"
  | "not-showing-profile";

export type PictureQueue = Array<{ uid: string; pictureIndex: number }>;
@Injectable({
  providedIn: "root",
})
export class SwipeStackStore extends AbstractStoreService {
  private readonly REGISTER_FREQUENCY = 4; // every how many swipe choices do we choose to register them on the database?
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
  private stackState = new BehaviorSubject<StackState>(null);

  private profiles$ = this.profiles.asObservable();
  profilesToRender$ = this.profilesToRender.asObservable();
  isReady$ = this.isReady.asObservable().pipe(distinctUntilChanged());
  stackState$ = this.stackState.asObservable().pipe(distinctUntilChanged());

  constructor(
    private firestore: AngularFirestore,
    private afFunctions: AngularFireFunctions,
    private afStorage: AngularFireStorage,

    private SCstore: SearchCriteriaStore,
    private swipeOutcomeStore: SwipeOutcomeStore,
    private currentUser: CurrentUserStore,

    private errorHandler: GlobalErrorHandler,
    private format: FormatService,
    private swipeCap: SwipeCapService,
    protected resetter: StoreResetter
  ) {
    super(resetter);
  }

  protected systemsToActivate(): Observable<any> {
    const postStackStateInit$ = this.stackState$.pipe(
      filter((ss) => !!ss),
      take(1),
      switchMapTo(
        combineLatest([
          this.manageSwipeStack(),
          this.manageRenderedProfiles(),
          this.managePictureQueue(),
          this.manageStoreReadiness(),
          this.manageChoiceRegistration(),
        ])
      )
    );

    return combineLatest([
      this.swipeCap.activate$,
      this.manageStackState(),
      postStackStateInit$,
    ]);
  }

  protected async resetStore() {
    this.isReady.next(false);
    this.stackState.next(null);
    this.profiles.next([]);
    this.profilesToRender.next([]);
  }

  manageSwipeStack() {
    const goOnStates: StackState[] = ["loading", "initialLoading"];
    const stackStateIsGood$ = this.stackState$.pipe(map((ss) => goOnStates.includes(ss)));
    const minProfilesCountReached$ = this.profiles$.pipe(
      this.filterUnchangedLength(),
      map((profiles) => profiles.length <= this.MIN_PROFILE_COUNT)
    );

    const fetchNewProfiles$ = combineLatest([
      stackStateIsGood$,
      minProfilesCountReached$,
    ]).pipe(filter((arr) => arr.every((v) => v === true)));

    return fetchNewProfiles$.pipe(switchMapTo(this.addToSwipeStackQueue()));
  }

  private manageChoiceRegistration() {
    const endOfStackStates: StackState[] = [
      "empty",
      "cap-reached",
      "not-showing-profile",
    ];

    const typicalRegistration$ = this.swipeOutcomeStore.swipeChoices$.pipe(
      filter((c) => c.length >= this.REGISTER_FREQUENCY),
      tap(() => console.log("typicalRegistration$")),
      exhaustMap(() => this.swipeOutcomeStore.registerSwipeChoices$)
    );

    const endOfStackRegistration$ = this.stackState$.pipe(
      filter((state) => endOfStackStates.includes(state)),
      // simple fix to problem where stackState becomes "cap-reached" while the final
      // choice has not been added yet, so the latter never gets registered.
      // Since this is the last one of the session either way, it doesn't hurt at all to wait for a few seconds
      delay(2000),
      tap(() => console.log("endOfStackRegistration$")),
      exhaustMap(() => this.swipeOutcomeStore.registerSwipeChoices$)
    );

    return merge(typicalRegistration$, endOfStackRegistration$);
  }

  manageStackState() {
    return combineLatest([
      this.profiles$.pipe(map((p) => p.length)),
      this.swipeCap.canUseSwipe$,
      this.currentUser.showsProfile$,
    ]).pipe(
      withLatestFrom<[number, boolean, boolean], [StackState]>(this.stackState$),
      map(([[profilesCount, canUseSwipe, showsProfile], currentStackState]) => {
        if (canUseSwipe === false) return this.stackState.next("cap-reached");

        if (showsProfile === false) return this.stackState.next("not-showing-profile");

        // if both canUseSwipe and showsProfile are initialized (and both true) but that the stackState
        // still isn't, then this is the initial load
        if (canUseSwipe === true && showsProfile === true && currentStackState === null)
          return this.stackState.next("initialLoading");

        // case where the user wasn't showing profile but now does
        if (currentStackState === "not-showing-profile" && showsProfile) {
          if (profilesCount > 0) return this.stackState.next("filled");
          // giving initialLoading value so that the algo doesn't think the stack
          // is empty because there is no profiles in the stack
          if (profilesCount === 0) return this.stackState.next("initialLoading");
        }

        if (
          (currentStackState === "loading" || currentStackState === "initialLoading") &&
          profilesCount > 0
        )
          return this.stackState.next("filled");

        if (currentStackState === "loading" && profilesCount === 0)
          return this.stackState.next("empty");

        if (currentStackState === "filled" && profilesCount === 0) {
          return this.stackState.next("loading");
        }

        // return this.stackState.next("loading");
      })
    );
  }

  manageStoreReadiness() {
    const isReadyRegardlessStates: StackState[] = [
      "cap-reached",
      "empty",
      "not-showing-profile",
    ];

    return combineLatest([this.profilesToRender$, this.stackState$]).pipe(
      filter(([profiles, state]) => {
        // this is here because the states "empty", "cap-reached" or "not-showing-profile" means that
        // regardless of the content of the renderedProfiles, it being empty is still
        // the store being ready (because it is normal if it is empty in these states)
        const isReadyRegardless = isReadyRegardlessStates.includes(state);

        // waits for the swipe stack to have at least one profile and for the first picture of first profile to be loaded
        const renderedProfilesAreInit =
          Array.isArray(profiles) && profiles.length > 0 && !!profiles[0]?.pictureUrls[0];

        return isReadyRegardless || renderedProfilesAreInit;
      }),
      take(1),
      tap(() => this.isReady.next(true))
    );
  }

  manageRenderedProfiles() {
    return this.profiles$.pipe(
      withLatestFrom(this.profilesToRender$, this.swipeCap.canUseSwipe$),
      filter(([allProfiles, profilesToRender, canUseSwipe]) => {
        if (!Array.isArray(allProfiles) || !Array.isArray(profilesToRender)) return false;
        if (!canUseSwipe) return false;
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
        if (profilesToRender.length !== 0 && allProfiles.length !== 0) {
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

      // this deals with the swipe cap
      withLatestFrom(this.swipeCap.swipesLeft$),
      map(([[allProfiles, profilesToRender], swipesLeft]) => {
        if (swipesLeft && swipesLeft.swipesLeft < profilesToRender.length) {
          return [
            allProfiles,
            profilesToRender.slice(0, Math.floor(swipesLeft.swipesLeft)),
          ];
        }
        return [allProfiles, profilesToRender];
      }),
      // withLatestFrom(this.profilesToRender$),
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
        {
          // newProfilesToRender = cloneDeep(newProfilesToRender);
          // if (!isEqual(currProfilesToRender, newProfilesToRender))
          this.profilesToRender.next(cloneDeep(newProfilesToRender));
        }
      )
    );
  }

  managePictureQueue() {
    // this relies on a particular fact: that adding new urls to the profiles BehaviorSubject
    // triggers profilesToRender$ to re-emit, thereby making it fetch the next batch of pictures on the priority list.
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
                // there needs to be something there so that we don't attempt to fetch it

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

  slideChangeListener$(ref: SwiperComponent): Observable<Swiper> {
    const slideChange$ = new Subject<Swiper>();
    ref.swiperRef.on("slideChange", (swiper) => {
      slideChange$.next(swiper);
    });
    return slideChange$;
  }

  managePictureSwiping(profileCards: QueryList<ProfileCardComponent>) {
    // triggers when there is a change to the array of rendered profiles
    // (usually means a profile has been added or removed)
    return profileCards.changes.pipe(
      filter((list: QueryList<ProfileCardComponent>) => !!list.first),
      // listens to the user's swiping on that profile
      switchMap((list: QueryList<ProfileCardComponent>) =>
        list.first.picSlides$.pipe(
          first(),
          switchMap((ref) =>
            this.slideChangeListener$(ref).pipe(
              map((swiper) => ({
                picIndex: swiper.realIndex,
                uid: list.first.profile.uid,
                profilePictures$: list.first.profilePictures$,
              }))
            )
          )
        )
      ),
      // Gets index of new slide
      // map((map) => ({
      //   picIndex: (map.slides.target as any)?.swiper?.realIndex as number,
      //   uid: map.uid,
      //   profilePictures$: (map as any).profilePictures$,
      // })),
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
    const dontContinueStates: StackState[] = [
      "empty",
      "cap-reached",
      "not-showing-profile",
    ];

    return (source: Observable<StackState>) => {
      return source.pipe(
        filter((stackState) => !dontContinueStates.includes(stackState))
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

          if (index === -1) return of("");

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
  public addToSwipeStackQueue() {
    return this.SCstore.searchCriteria$.pipe(
      take(1),
      switchMap((SC) => this.fetchUIDs(SC)),
      switchMap((uids) => {
        // takes care of case where generateSwipeStack returns an empty array
        if (!uids || uids.length < 1) return of(this.stackState.next("empty"));

        return this.fetchProfiles(uids).pipe(concatMap((p) => this.addToQueue(p)));
      })
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
        return profileToRemove?.pictureUrls;
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
    return this.addPictureCounts(newProfiles).pipe(
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
      exhaustMap((request) =>
        this.afFunctions
          .httpsCallable<generateSwipeStackRequest, generateSwipeStackResponse>(
            "generateSwipeStack"
          )(request)
          .pipe(
            this.errorHandler.convertErrors("cloud-functions"),
            this.errorHandler.handleErrors()
          )
      ),
      concatMap((r) =>
        this.swipeOutcomeStore
          .addToSwipeAnswers(r.users)
          .pipe(mapTo((r?.users ?? []).map((u) => u.uid)))
      )
    );
  }

  /** Gets data from profile docs from an array of uids */
  private fetchProfiles(uids: string[]): Observable<Profile[]> {
    if (uids.length < 1) return of([]);
    return forkJoin(
      uids.map((uid) =>
        (
          this.firestore.collection("profiles").doc(uid).get() as Observable<
            DocumentSnapshot<profileFromDatabase>
          >
        ).pipe(
          this.errorHandler.convertErrors("firestore"),
          this.errorHandler.handleErrors()
        )
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

  addPictureCounts(profiles: Profile[]): Observable<Profile[]> {
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
}
