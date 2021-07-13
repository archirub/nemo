import { AngularFireStorage } from "@angular/fire/storage";
import { Injectable } from "@angular/core";

import { BehaviorSubject, forkJoin, Observable, EMPTY } from "rxjs";
import { exhaustMap, filter, map, take, tap } from "rxjs/operators";

import { Profile } from "@classes/index";
import { AngularFirestore, DocumentSnapshot } from "@angular/fire/firestore";
import { profileFromDatabase } from "@interfaces/index";
import { FormatService } from "@services/index";

interface ProfileHolder {
  [uid: string]: Profile;
}

// PURPOSE OF THIS STORE:
// stores profile which have already been loaded to save on the number of queries to the database.
// This is not necessary for the swipe stack, as these profiles are only viewed once. It is
// useful for profiles in the messenger and in new matches

// HOW TO USE: two things to do
// - subscribe to the "profiles$" observable in the template. this will give all the profiles stored,
// the profile of the user that's needed will be found under the key that's his/her uid
// - subscribe to checkAndSave in the component. This will fetch the profile and the pictures and add
// them to the observable if they aren't already there

// NOTE:
// - All profiles must be deleted, or at least all ObjectUrls must be revoked when the app terminates

@Injectable({
  providedIn: "root",
})
export class OtherProfilesStore {
  private profiles = new BehaviorSubject<ProfileHolder>({});
  profiles$ = this.profiles.asObservable();

  constructor(
    private afStorage: AngularFireStorage,
    private firestore: AngularFirestore,
    private format: FormatService
  ) {}

  resetStore() {
    const profiles = this.profiles.value;

    Object.keys(profiles).forEach((uid) => {
      this.revokeUrls(profiles[uid].pictureUrls);
    });

    this.profiles.next({});
  }

  /**
   * to subscribe to to check whether a certain user's profile is stored in the store,
   * and if it isn't, to add it as well as its pictures
   */
  checkAndSave(uid: string): Observable<{ uid: string; pictures: string[] }> {
    const profileSnapshot$ = this.firestore
      .collection("profiles")
      .doc(uid)
      .get() as Observable<DocumentSnapshot<profileFromDatabase>>;

    return this.hasProfile(uid).pipe(
      filter((hasProfile) => !hasProfile), // continue only if profile is not in store
      exhaustMap((a) => profileSnapshot$), // fetch profile from database
      map((doc) => {
        if (!doc.exists) return;

        return this.format.profileDatabaseToClass(uid, doc.data());
      }), // modify format
      exhaustMap((profile) => {
        if (!!profile) return this.saveProfile(uid, profile);

        return EMPTY;
      }), // save profile to store
      exhaustMap((profile) => {
        if (!!profile) return this.getPictureUrls(uid, profile.pictureCount);

        return EMPTY;
      }), // fetch pictures
      exhaustMap((pictures) => {
        if (!!pictures) return this.addProfilePictures(uid, pictures);

        return EMPTY;
      }) // save pictures to store
    );
  }

  removeProfile(uid: string): Observable<void> {
    return this.profiles$.pipe(
      map((profileHolder) => {
        if (profileHolder.hasOwnProperty(uid)) {
          this.revokeUrls(profileHolder[uid].pictureUrls); // revokes urls
          delete profileHolder[uid]; // deletes the profile from the store
          this.profiles.next(profileHolder); // updates the store
        }
      })
    );
  }

  /**
   * returns an observable of a boolean indicating whether the profile with uid "uid" is
   * in the store
   */
  hasProfile(uid: string): Observable<boolean> {
    return this.profiles$.pipe(
      map((holder) => {
        if (holder.hasOwnProperty(uid) && holder[uid]) return true;
        return false;
      })
    );
  }

  /**
   * saves the profile to the store, emits the profile
   */
  saveProfile(uid: string, profile: Profile): Observable<Profile> {
    return this.profiles$.pipe(
      take(1),
      map((holder) => {
        holder[uid] = profile;
        this.profiles.next(holder);
        return profile;
      })
    );
  }

  addProfilePictures(
    uid: string,
    pictures: string[]
  ): Observable<{ uid: string; pictures: string[] }> {
    return this.profiles$.pipe(
      take(1),
      map((holder) => {
        if (holder.hasOwnProperty(uid)) {
          holder[uid].pictureUrls = pictures;
          this.profiles.next(holder);
          return { uid, pictures };
        }
      })
    );
  }

  // removeProfilePictures(uid: string): Observable<void> {
  //   return this.profiles$.pipe(
  //     map((holder) => {
  //       if (!holder.hasOwnProperty(uid)) return;
  //       this.revokeUrls(holder[uid].pictureUrls);
  //       holder[uid].pictureUrls = [];
  //       this.profiles.next(holder);
  //     })
  //   );
  // }

  /**
   * revokes the urls provided in the array. Important for memory management.
   */
  private revokeUrls(pictures: string[]): void {
    pictures.forEach((url) => {
      URL.revokeObjectURL(url);
    });
  }

  /**
   * Fetches and returns the picture urls of the given pictures
   */
  getPictureUrls(uid: string, pictureCount: number): Observable<string[]> {
    const downloadUrls$ = Array.from({ length: pictureCount }).map((v, index) =>
      this.afStorage.ref("profilePictures/" + uid + "/" + index).getDownloadURL()
    );
    return forkJoin(downloadUrls$);
  }
}
