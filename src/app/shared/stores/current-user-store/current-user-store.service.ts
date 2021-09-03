import { AngularFireFunctions } from "@angular/fire/functions";
import { Injectable } from "@angular/core";
import { AngularFireAuth } from "@angular/fire/auth";
import { AngularFirestore } from "@angular/fire/firestore";

import { BehaviorSubject, forkJoin, from, Observable, of } from "rxjs";

import { Profile, SearchCriteria, User } from "@classes/index";
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
import { SearchCriteriaStore } from "../search-criteria-store/search-criteria-store.service";
import {
  catchError,
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
  private user: BehaviorSubject<User> = new BehaviorSubject<User>(null);
  public readonly user$: Observable<User> = this.user.asObservable();

  constructor(
    private afAuth: AngularFireAuth,
    private fs: AngularFirestore,
    private afFunctions: AngularFireFunctions,
    private format: FormatService,
    private SCstore: SearchCriteriaStore
  ) {}

  updateProfile(newProfile: Profile): Observable<void> {
    return this.afAuth.user.pipe(
      take(1),
      withLatestFrom(this.user$),
      switchMap(([userAuth, userData]) => {
        if (!userAuth) throw "no user authenticated";

        return from(
          this.fs
            .collection("profiles")
            .doc(userAuth.uid)
            .set(this.format.profileClassToDatabase(newProfile))
        ).pipe(map(() => userData));
      }),
      map((userData) => {
        Object.entries(this.format.profileClassToDatabase(newProfile)).forEach(
          ([key, value]) => {
            userData[key] = value;
          }
        );

        this.user.next(userData);
      })
    );
  }

  updateLatestSearchCriteriaOnDb(searchCriteria: SearchCriteria) {}

  /** Fetches info from database to update the User BehaviorSubject */
  fillStore(): Observable<{
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

      map(([profile, privateProfile, infoFromMatchData]) => {
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

        this.SCstore.initalizeThroughCurrentUserStore(latestSearchCriteria);

        const user: User = new User(
          profile?.uid,
          profile?.firstName,
          profile?.dateOfBirth,
          profile?.pictureCount,
          profile?.pictureUrls,
          profile?.biography,
          profile?.university,
          profile?.course,
          profile?.society,
          profile?.societyCategory,
          profile?.areaOfStudy,
          profile?.interests,
          profile?.questions,
          profile?.onCampus,
          profile?.degree,
          profile?.socialMediaLinks,
          privateProfile?.settings,
          latestSearchCriteria,
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

  updateFieldsOnDatabase(
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
            })
          );
      })
    );
  }

  resetStore() {
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
        })
      );
  }

  updatePictureCount(newCount: number): Observable<any> {
    return this.afAuth.user.pipe(
      withLatestFrom(this.user$),
      take(1),
      switchMap(([authUser, storeUser]) => {
        if (!authUser) return of();

        storeUser.pictureCount = newCount;

        return from(
          this.fs
            .collection("profiles")
            .doc(authUser.uid)
            .update({ pictureCount: newCount })
        ).pipe(map(() => this.user.next(storeUser)));
      })
    );
  }
}
