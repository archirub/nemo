import { Injectable, OnInit } from "@angular/core";
import { AngularFireAuth } from "@angular/fire/auth";
import { AngularFirestore } from "@angular/fire/firestore";

import { BehaviorSubject, Observable } from "rxjs";

import { Profile, User } from "@classes/index";
import {
  Gender,
  matchObjectFromDatabase,
  privateProfileFromDatabase,
  profileFromDatabase,
  SexualPreference,
  SwipeMode,
} from "@interfaces/index";
import { FormatService } from "@services/index";

interface userInfoFromMatchData {
  gender: Gender;
  sexualPreference: SexualPreference;
  swipeMode: SwipeMode;
  showProfile: Boolean;
}

@Injectable({
  providedIn: "root",
})
export class CurrentUserStoreService implements OnInit {
  private _user: BehaviorSubject<User>;
  public readonly user: Observable<User>;

  constructor(
    private fs: AngularFirestore,
    private format: FormatService,
    private afAuth: AngularFireAuth
  ) {
    this._user = new BehaviorSubject<User>(null);
    this.user = this._user.asObservable();
  }

  ngOnInit() {
    this.afAuth.currentUser
      .then((user) => {
        if (user) {
          return this.updateUser(user.uid).then(() =>
            console.log("Current user object successfully initialized.")
          );
        }
        console.error("User not logged in");
      })
      .catch((e) => {
        console.error(
          `The current user's User object couldn't be updated - ${e}`
        );
      });
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

  /** THIS IS TEMPORARY - since there is currently error internal for cloud functions calls.
   * We can't fetch data directly from matchData doc (for security reasons), a cloud function
   * to fetch the info needed from it here is therefore required. So once internal error is resolved,
   * create that function and make a call to it in the function below.
   */
  private async fetchMatchDataEl(uid: string): Promise<userInfoFromMatchData> {
    if (!uid) {
      console.error("No uid provided");
      return;
    }
    const query = this.fs.firestore.collection("matchData").doc(uid);

    const snapshot = await query.get();
    if (snapshot.exists) {
      const data = snapshot.data() as matchObjectFromDatabase;
      const gender = data.gender;
      const sexualPreference = data.sexualPreference;
      const swipeMode = data.swipeMode;
      const showProfile = data.showProfile;
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
      this.fetchMatchDataEl(uid),
    ]);
    const profile: Profile = profileParts[0];
    const privateProfile: privateProfileFromDatabase = profileParts[1];
    const infoFromMatchData: userInfoFromMatchData = profileParts[2];

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
      infoFromMatchData.gender,
      infoFromMatchData.sexualPreference,
      infoFromMatchData.swipeMode,
      infoFromMatchData.showProfile
    );

    this._user.next(user);
  }
}
