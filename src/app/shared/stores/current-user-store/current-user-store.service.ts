import { AngularFireFunctions } from "@angular/fire/functions";
import { Injectable } from "@angular/core";
import { AngularFireAuth } from "@angular/fire/auth";
import { AngularFirestore } from "@angular/fire/firestore";

import { BehaviorSubject, forkJoin, from, Observable } from "rxjs";

import { Profile, User } from "@classes/index";
import {
  getMatchDataUserInfoResponse,
  privateProfileFromDatabase,
  profileFromDatabase,
  userInfoFromMatchData,
} from "@interfaces/index";
import { FormatService } from "@services/index";
import { SearchCriteriaStore } from "../search-criteria-store/search-criteria-store.service";
import { map } from "rxjs/operators";

@Injectable({
  providedIn: "root",
})
export class CurrentUserStore {
  private user: BehaviorSubject<User> = new BehaviorSubject<User>(null);
  public readonly user$: Observable<User> = this.user.asObservable();

  constructor(
    private fs: AngularFirestore,
    private afFunctions: AngularFireFunctions,
    private format: FormatService,
    private SCstore: SearchCriteriaStore
  ) {}

  /** Initialises the store
   * returns uid so that store initializations can be chained
   */
  // public async initializeStore(uid: string): Promise<string> {
  //   await this.fillStore(uid);
  //   console.log("currentUserStore initialized.");
  //   return uid;
  // }

  /** Fetches info from database to update the User BehaviorSubject */
  fillStore(uid: string): Observable<{
    profileSuccess: boolean;
    privateProfileSuccess: boolean;
    matchDataSuccess: boolean;
  }> {
    const profileParts$ = [
      this.fetchProfile(uid),
      this.fetchPrivateProfile(uid),
      this.fetchMatchDataInfo(uid),
    ] as [
      Observable<Profile>,
      Observable<privateProfileFromDatabase>,
      Observable<userInfoFromMatchData>
    ];

    return forkJoin(profileParts$).pipe(
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
          profile?.interests,
          profile?.questions,
          profile?.onCampus,
          profile?.degree,
          profile?.socialMediaLinks,
          privateProfile?.settings,
          latestSearchCriteria,
          infoFromMatchData?.gender,
          infoFromMatchData?.sexualPreference,
          infoFromMatchData?.swipeMode
        );

        this.user.next(user);

        return successResponse;
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
  private fetchMatchDataInfo(uid: string): Observable<userInfoFromMatchData | null> {
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
}
