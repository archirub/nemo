import { Gender, SexualPreference } from "./../../interfaces/match-data.model";
import { AngularFireFunctions } from "@angular/fire/compat/functions";
import { Injectable } from "@angular/core";
import { AngularFireAuth } from "@angular/fire/compat/auth";
import { AngularFirestore } from "@angular/fire/compat/firestore";

import { BehaviorSubject, forkJoin, from, Observable, of } from "rxjs";

import { Profile, SearchCriteria, AppUser } from "@classes/index";
import {
  getMatchDataUserInfoResponse,
  privateProfileFromDatabase,
  profileFromDatabase,
  userInfoFromMatchData,
  editableProfileFields,
  profileEditingByUserRequest,
  successResponse,
} from "@interfaces/index";
import { FormatService } from "@services/format/format.service";
import {
  catchError,
  distinctUntilChanged,
  filter,
  map,
  share,
  switchMap,
  take,
  tap,
  withLatestFrom,
} from "rxjs/operators";
import { isEqual } from "lodash";

@Injectable({
  providedIn: "root",
})
export class CurrentUserStore {
  private user: BehaviorSubject<AppUser> = new BehaviorSubject<AppUser>(null);
  public user$: Observable<AppUser> = this.user.asObservable();

  public isReady$ = this.user$.pipe(
    map((user) => user instanceof AppUser),
    distinctUntilChanged()
  );

  constructor(
    private afAuth: AngularFireAuth,
    private fs: AngularFirestore,
    private afFunctions: AngularFireFunctions,
    private format: FormatService
  ) {}

  updateLatestSearchCriteriaOnDb(searchCriteria: SearchCriteria) {}

  /** Fetches info from database to update the User BehaviorSubject */
  public fillStore(): Observable<{
    profileSuccess: boolean;
    privateProfileSuccess: boolean;
    matchDataSuccess: boolean;
  }> {
    return this.afAuth.user.pipe(
      take(1),
      switchMap((user) => {
        if (!user) throw "no user authenticated";

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
          profile?.biography,
          profile?.university,
          profile?.course,
          profile?.society,
          profile?.societyCategory,
          profile?.areaOfStudy,
          profile?.interests,
          profile?.questions,
          // profile?.onCampus,
          profile?.degree,
          profile?.socialMediaLinks,
          privateProfile?.settings,
          latestSearchCriteria ?? {},
          infoFromMatchData?.gender,
          infoFromMatchData?.sexualPreference
          // infoFromMatchData?.swipeMode
        );

        this.user.next(user);

        return successResponse;
      }),
      catchError((error) => {
        if (error === "no user authenticated")
          return of({
            profileSuccess: false,
            privateProfileSuccess: false,
            matchDataSuccess: false,
          });
      }),
      share()
      // tap(() => console.log("activating current user store"))
    );
  }

  public updateFieldsOnDatabase(
    editableFields: editableProfileFields
  ): Observable<successResponse | {}> {
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
        console.log("the editable fields here are", editableFields);
        if (isEqual(editableFieldsOfStore, editableFields)) return of({});

        return this.afFunctions
          .httpsCallable("profileEditingByUser")(requestData)
          .pipe(
            map((response: successResponse) => {
              if (response.successful) {
                Object.keys(editableFields).forEach((field) => {
                  user[field] = JSON.parse(JSON.stringify(editableFields[field]));
                });

                this.user.next(user);
              } else {
                console.error("unsuccessful change of profile on db:", response?.message);
              }
              return response;
            }),
            catchError((err) => {
              console.log("profile editing by user error");
              return of(null);
            })
          );
      })
    );
  }

  public async updateGenderSexPrefInStore(
    newGender: Gender | null,
    newSexualPreference: SexualPreference | null
  ) {
    return this.user$
      .pipe(
        take(1),
        map((u) => {
          if (newGender == null && newSexualPreference == null) return;
          if (newGender != null) u.gender = newGender;
          if (newSexualPreference != null) u.sexualPreference = newSexualPreference;
          this.user.next(u);
        })
      )
      .toPromise();
  }

  public async updateShowProfileInStore(newShowProfile: boolean) {
    return this.user$
      .pipe(
        take(1),
        map((u) => {
          if (newShowProfile == null || u?.settings?.showProfile == null) return;
          u.settings.showProfile = newShowProfile;
          this.user.next(u);
        })
      )
      .toPromise();
  }

  public resetStore() {
    this.user.next(null);
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

      catchError((err) => {
        console.log("error profile", err);
        return of(null);
      })
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

      catchError((err) => {
        console.log("error private ", err);
        return of(null);
      })
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

        catchError((err) => {
          console.log("error match data info", err);
          return of(null);
        })
      );
  }
}
