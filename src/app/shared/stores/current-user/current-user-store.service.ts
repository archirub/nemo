import { AngularFireFunctions } from "@angular/fire/functions";
import { Injectable } from "@angular/core";
import { AngularFireAuth } from "@angular/fire/auth";
import { AngularFirestore } from "@angular/fire/firestore";
import { AngularFireStorage } from "@angular/fire/storage";

import {
  catchError,
  distinctUntilChanged,
  filter,
  first,
  map,
  shareReplay,
  switchMap,
  take,
  tap,
} from "rxjs/operators";
import { BehaviorSubject, firstValueFrom, forkJoin, from, Observable, of } from "rxjs";
import { isEqual } from "lodash";

import { FormatService } from "@services/format/format.service";

import { Profile, AppUser } from "@classes/index";
import {
  getMatchDataUserInfoResponse,
  privateProfileFromDatabase,
  profileFromDatabase,
  userInfoFromMatchData,
  editableProfileFields,
  profileEditingByUserRequest,
  CustomError,
} from "@interfaces/index";

import { Gender, SexualPreference } from "./../../interfaces/match-data.model";
import { GlobalErrorHandler } from "@services/errors/global-error-handler.service";

@Injectable({
  providedIn: "root",
})
export class CurrentUserStore {
  private user: BehaviorSubject<AppUser> = new BehaviorSubject<AppUser>(null);

  public user$: Observable<AppUser> = this.user.asObservable();

  public fillStore$ = this.getFillStore();

  public isReady$ = this.user$.pipe(
    map((user) => user instanceof AppUser),
    distinctUntilChanged()
  );

  constructor(
    private afAuth: AngularFireAuth,
    private fs: AngularFirestore,
    private afFunctions: AngularFireFunctions,
    private afStorage: AngularFireStorage,

    private format: FormatService,
    private errorHandler: GlobalErrorHandler
  ) {}

  /** Fetches info from database to update the User BehaviorSubject */
  private getFillStore() {
    return this.afAuth.user.pipe(
      first(),
      switchMap((user) => {
        if (!user) throw new CustomError("local/check-auth-state", "local");

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
          profile?.pictureUrls,
          profile?.pictureCount,
          profile?.biography,
          profile?.university,
          profile?.course,
          profile?.society,
          profile?.societyCategory,
          profile?.areaOfStudy,
          profile?.interests,
          profile?.questions,
          profile?.degree,
          profile?.socialMediaLinks,
          privateProfile?.settings,
          latestSearchCriteria ?? {},
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
            first(),
            map((list) => list.items.length),
            tap((count) => (user.pictureCount = count)),
            map(() => user),
            this.errorHandler.convertErrors("firebase-storage"),
            this.errorHandler.handleErrors()
          )
      ),
      tap((user) => this.user.next(user)),

      shareReplay()
      // tap(() => console.log("activating current user store"))
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
                user[field] = JSON.parse(JSON.stringify(editableFields[field]));

                this.user.next(user);
              });
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
        first(),
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
        first(),
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

  public resetStore() {
    this.user.next(null);
  }
}
