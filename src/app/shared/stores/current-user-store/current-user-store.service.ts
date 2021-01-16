import { AngularFireFunctions } from "@angular/fire/functions";
import { Injectable } from "@angular/core";
import { AngularFireAuth } from "@angular/fire/auth";
import { AngularFirestore } from "@angular/fire/firestore";

import { BehaviorSubject, Observable } from "rxjs";

import { Profile, User } from "@classes/index";
import {
  getMatchDataUserInfoResponse,
  privateProfileFromDatabase,
  profileFromDatabase,
  userInfoFromMatchData,
} from "@interfaces/index";
import { FormatService } from "@services/index";
import { SearchCriteriaStore } from "../search-criteria-store/search-criteria-store.service";

@Injectable({
  providedIn: "root",
})
export class CurrentUserStore {
  private _user: BehaviorSubject<User>;
  public readonly user: Observable<User>;

  constructor(
    private fs: AngularFirestore,
    private afFunctions: AngularFireFunctions,
    private format: FormatService,
    private SCstore: SearchCriteriaStore
  ) {
    this._user = new BehaviorSubject<User>(null);
    this.user = this._user.asObservable();
  }

  /** Initialises the store
   * returns uid so that store initializations can be chained
   */
  public async initializeStore(uid: string): Promise<string> {
    if (!uid) {
      console.error("No uid provided");
      return;
    }
    await this.updateUser(uid);
    console.log("currentUserStore initialized.");
    return uid;
  }

  /** From the user's id, returns a Profile object containing info from
   * their profile doc on database
   */
  private async fetchProfile(uid: string): Promise<Profile> {
    if (!uid) {
      console.error("No uid provided");
      return;
    }
    const query = this.fs.firestore.collection("profiles").doc(uid);
    const snapshot = await query.get();
    if (snapshot.exists) {
      const data = snapshot.data() as profileFromDatabase;
      return this.format.profileDatabaseToClass(snapshot.id, data);
    }
    console.error("No document found from profile query");
  }

  /** From the user's id, returns a Profile object containing info from
   * the private part of their profile doc on database
   */
  private async fetchPrivateProfile(
    uid: string
  ): Promise<privateProfileFromDatabase> {
    if (!uid) {
      console.error("No uid provided");
      return;
    }
    const query = this.fs.firestore
      .collection("profiles")
      .doc(uid)
      .collection("private")
      .doc("private");
    const snapshot = await query.get();
    if (snapshot.exists) {
      const data = snapshot.data() as privateProfileFromDatabase;
      return data;
    }
  }

  /**
   * Fetches data relevant to user object creation in matchData document
   */
  private async fetchMatchDataInfo(
    uid: string
  ): Promise<userInfoFromMatchData> {
    if (!uid) {
      console.error("No uid provided");
      return;
    }
    const query = this.fs.firestore.collection("matchData").doc(uid);

    const responseData = (await this.afFunctions
      .httpsCallable("getMatchDataUserInfo")({})
      .toPromise()) as getMatchDataUserInfoResponse;

    if (responseData) {
      const gender = responseData.gender;
      const sexualPreference = responseData.sexualPreference;
      const swipeMode = responseData.swipeMode;
      const showProfile = responseData.showProfile;
      return { gender, sexualPreference, swipeMode, showProfile };
    }
  }

  /** Fetches info from database to update the User BehaviorSubject */
  private async updateUser(uid: string): Promise<User> {
    if (!uid) {
      console.error("No uid provided");
      return;
    }
    const profileParts = await Promise.all([
      this.fetchProfile(uid),
      this.fetchPrivateProfile(uid),
      this.fetchMatchDataInfo(uid),
    ]);
    const profile: Profile = profileParts[0];
    const privateProfile: privateProfileFromDatabase = profileParts[1];
    const infoFromMatchData: userInfoFromMatchData = profileParts[2];

    const latestSearchCriteria = this.format.searchCriteriaDatabaseToClass(
      privateProfile.latestSearchCriteria
    );
    this.SCstore.initalizeThroughCurrentUserStore(latestSearchCriteria);

    const user: User = new User(
      profile.uid,
      profile.displayName,
      profile.dateOfBirth,
      profile.pictures,
      profile.biography,
      profile.university,
      profile.course,
      profile.society,
      profile.interests,
      profile.questions,
      profile.location,
      profile.socialMediaLinks,
      privateProfile.firstName,
      privateProfile.lastName,
      privateProfile.settings,
      latestSearchCriteria,
      infoFromMatchData.gender,
      infoFromMatchData.sexualPreference,
      infoFromMatchData.swipeMode,
      infoFromMatchData.showProfile
    );

    this._user.next(user);
  }
}
