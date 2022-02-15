import { AngularFireFunctions } from "@angular/fire/functions";
import { Injectable } from "@angular/core";
import { AngularFirestore } from "@angular/fire/firestore";
import { AngularFireStorage } from "@angular/fire/storage";

import {
  distinctUntilChanged,
  filter,
  map,
  shareReplay,
  switchMap,
  take,
  tap,
} from "rxjs/operators";
import { BehaviorSubject, firstValueFrom, forkJoin, from, Observable, of } from "rxjs";
import { cloneDeep, isEqual } from "lodash";

import { FormatService } from "@services/format/format.service";

import { Profile, AppUser } from "@classes/index";
import {
  getMatchDataUserInfoResponse,
  privateProfileFromDatabase,
  profileFromDatabase,
  userInfoFromMatchData,
  editableProfileFields,
  profileEditingByUserRequest,
} from "@interfaces/index";

import { Gender, SexualPreference } from "./../../interfaces/match-data.model";
import { GlobalErrorHandler } from "@services/errors/global-error-handler.service";
import { StoreResetter } from "@services/global-state-management/store-resetter.service";
import { AbstractStoreService } from "@interfaces/stores.model";

@Injectable({
  providedIn: "root",
})
export class CurrentUserStore extends AbstractStoreService {
  private user: BehaviorSubject<AppUser> = new BehaviorSubject<AppUser>(null);
  public user$: Observable<AppUser> = this.user.asObservable();

  public isReady$ = this.user$.pipe(
    map((user) => user instanceof AppUser),
    distinctUntilChanged()
  );

  constructor(
    private fs: AngularFirestore,
    private afFunctions: AngularFireFunctions,
    private afStorage: AngularFireStorage,

    private format: FormatService,
    private errorHandler: GlobalErrorHandler,
    protected resetter: StoreResetter
  ) {
    super(resetter);
  }

  protected systemsToActivate() {
    return this.fillStore();
  }

  protected async resetStore() {
    this.user.next(null);
  }

  public showsProfile$ = this.user$.pipe(
    map((u) => u?.settings?.showProfile),
    distinctUntilChanged()
  ); // null as default (important for swipe stack to know it hasn't been defined yet)

  /** Fetches info from database to update the User BehaviorSubject */
  private fillStore() {
    return this.errorHandler.getCurrentUser$().pipe(
      take(1),
      switchMap((user) => {
        const profileParts$ = [
          this.fetchProfile(user.uid),
          this.fetchPrivateProfile(user.uid),
          this.fetchMatchDataInfo(),
        ] as [
          Observable<Profile>,
          Observable<privateProfileFromDatabase>,
          Observable<userInfoFromMatchData>
        ];

        return forkJoin(profileParts$);
      }),
      this.errorHandler.handleErrors(),
      switchMap(async ([profile, privateProfile, infoFromMatchData]) => {
        const successResponse: {
          profileSuccess: boolean;
          privateProfileSuccess: boolean;
          matchDataSuccess: boolean;
        } = { profileSuccess: true, privateProfileSuccess: true, matchDataSuccess: true };

        if (!profile) {
          successResponse.profileSuccess = false;
        }
        if (!privateProfile) {
          successResponse.privateProfileSuccess = false;
        }
        if (!infoFromMatchData) {
          successResponse.matchDataSuccess = false;
        }

        const latestSearchCriteria = this.format.searchCriteriaDatabaseToClass(
          privateProfile?.latestSearchCriteria
        );

        const user: AppUser = new AppUser(
          profile?.uid,
          profile?.firstName,
          profile?.dateOfBirth,
          profile?.pictureUrls ?? [],
          profile?.pictureCount,
          profile?.biography,
          profile?.university,
          profile?.course,
          profile?.society,
          profile?.societyCategory,
          profile?.areaOfStudy,
          profile?.interests ?? [], // important that it defaults to an array instead of null (own-profile / interests component)
          profile?.questions ?? [], // important that it defaults to an array instead of null (own-profile)
          profile?.degree,
          profile?.socialMediaLinks ?? [],
          privateProfile?.settings,
          latestSearchCriteria ?? {},
          privateProfile?.hasSeenTutorial ?? {
            home: false,
            ownProfile: false,
            chatBoard: false,
          },
          infoFromMatchData?.gender,
          infoFromMatchData?.sexualPreference
        );

        return user;
      }),
      switchMap((user) =>
        this.afStorage
          .ref("/profilePictures/" + user.uid)
          .listAll()
          .pipe(
            take(1),
            map((list) => list.items.length),
            tap((count) => (user.pictureCount = count)),
            map(() => user),
            this.errorHandler.convertErrors("firebase-storage"),
            this.errorHandler.handleErrors()
          )
      ),
      tap((user) => this.user.next(user)),

      shareReplay()
    );
  }

  updatePictureCount(count: number) {
    return this.user$.pipe(
      filter((u) => !!u),
      take(1),
      map((user) => {
        const newUser = cloneDeep(user);
        newUser.pictureCount = count;
        this.user.next(newUser);
      })
    );
  }

  public updateFieldsOnDatabase(
    editableFields: editableProfileFields
  ): Observable<void | {}> {
    const requestData: profileEditingByUserRequest = { data: editableFields };

    return this.user$.pipe(
      filter((user) => !!user),
      take(1),
      switchMap((user) => {
        // such that a modification only occurs if objects are different
        const editableFieldsOfStore: editableProfileFields = {
          biography: user.biography,
          course: user.course,
          areaOfStudy: user.areaOfStudy,
          society: user.society,
          societyCategory: user.societyCategory,
          interests: user.interests,
          questions: user.questions,
        };
        if (isEqual(editableFieldsOfStore, editableFields)) return of({});

        return this.afFunctions
          .httpsCallable("profileEditingByUser")(requestData)
          .pipe(
            map(() => {
              Object.keys(editableFields).forEach((field) => {
                user[field] = editableFields[field];
              });
              this.user.next(user);
            }),
            this.errorHandler.convertErrors("cloud-functions"),
            this.errorHandler.handleErrors()
          );
      })
    );
  }

  public async updateGenderSexPrefInStore(
    newGender: Gender | null,
    newSexualPreference: SexualPreference | null
  ) {
    return firstValueFrom(
      this.user$.pipe(
        take(1),
        map((u) => {
          if (newGender == null && newSexualPreference == null) return;
          if (newGender != null) u.gender = newGender;
          if (newSexualPreference != null) u.sexualPreference = newSexualPreference;
          this.user.next(u);
        })
      )
    );
  }

  public async updateShowProfileInStore(newShowProfile: boolean) {
    return firstValueFrom(
      this.user$.pipe(
        take(1),
        map((u) => {
          if (newShowProfile == null || u?.settings?.showProfile == null) return;
          u.settings.showProfile = newShowProfile;
          this.user.next(u);
        })
      )
    );
  }

  /** From the user's id, returns a Profile object containing info from
   * their profile doc on database
   */
  private fetchProfile(uid: string): Observable<Profile | null> {
    const query = this.fs.firestore.collection("profiles").doc(uid);
    return from(query.get()).pipe(
      map((snapshot) => {
        if (snapshot.exists) {
          const data = snapshot.data() as profileFromDatabase;
          return this.format.profileDatabaseToClass(snapshot.id, data);
        }
      }),
      this.errorHandler.convertErrors("firestore"),
      this.errorHandler.handleErrors()
    );
  }

  /** From the user's id, returns a Profile object containing info from
   * the private part of their profile doc on database
   */
  private fetchPrivateProfile(
    uid: string
  ): Observable<privateProfileFromDatabase | null> {
    const query = this.fs.firestore
      .collection("profiles")
      .doc(uid)
      .collection("private")
      .doc("private");

    return from(query.get()).pipe(
      map((snapshot) => {
        if (snapshot.exists) {
          const data = snapshot.data() as privateProfileFromDatabase;
          return data;
        }
      }),
      this.errorHandler.convertErrors("firestore"),
      this.errorHandler.handleErrors()
    );
  }

  /**
   * Fetches data relevant to user object creation in matchData document
   */
  private fetchMatchDataInfo(): Observable<userInfoFromMatchData | null> {
    return this.afFunctions
      .httpsCallable("getMatchDataUserInfo")({})
      .pipe(
        map((res: getMatchDataUserInfoResponse) => {
          if (res) {
            const gender = res?.gender;
            const sexualPreference = res?.sexualPreference;
            const swipeMode = res?.swipeMode;

            return { gender, sexualPreference, swipeMode };
          }
        }),
        this.errorHandler.convertErrors("cloud-functions"),
        this.errorHandler.handleErrors()
      );
  }
}
