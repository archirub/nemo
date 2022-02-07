import { Injectable } from "@angular/core";
import { AngularFireStorage } from "@angular/fire/storage";
import { AngularFirestore, DocumentSnapshot } from "@angular/fire/firestore";

import {
  BehaviorSubject,
  forkJoin,
  Observable,
  EMPTY,
  combineLatest,
  of,
  firstValueFrom,
} from "rxjs";
import { exhaustMap, filter, first, map, share, take, tap } from "rxjs/operators";

import { FormatService } from "@services/format/format.service";

import { Profile } from "@classes/index";
import { profileFromDatabase } from "@interfaces/index";
import { GlobalErrorHandler } from "@services/errors/global-error-handler.service";
import { StoreResetter } from "@services/global-state-management/store-resetter.service";
import { AbstractStoreService } from "@interfaces/stores.model";
import { cloneDeep } from "lodash";

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
export class OtherProfilesStore extends AbstractStoreService {
  private profiles = new BehaviorSubject<ProfileHolder>({});
  profiles$ = this.profiles.asObservable();

  isReady$ = null;

  constructor(
    private afStorage: AngularFireStorage,
    private firestore: AngularFirestore,

    private errorHandler: GlobalErrorHandler,
    private format: FormatService,
    protected resetter: StoreResetter
  ) {
    super(resetter);
  }

  protected systemsToActivate() {
    return EMPTY;
  }

  async resetStore() {
    const profiles = await firstValueFrom(this.profiles);

    Object.keys(profiles).forEach((uid) => {
      this.revokeUrls(profiles[uid].pictureUrls);
    });

    this.profiles.next({});
  }

  /**
   * saves the profile to the store, emits the profile
   */
  public saveProfile(profile: Profile): Observable<Profile> {
    return this.profiles$.pipe(
      take(1),
      map((holder) => {
        const newHolder = cloneDeep(holder);
        newHolder[profile.uid] = profile;
        this.profiles.next(newHolder);
        return profile;
      })
    );
  }

  public removeProfile(uid: string): Observable<void> {
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
   * to subscribe to to check whether a certain user's profile is stored in the store,
   * and if it isn't, to add it as well as its pictures
   */
  public checkAndSave(uid: string): Observable<{ uid: string; pictures: string[] }> {
    const profileSnapshot$ = this.firestore
      .collection("profiles")
      .doc(uid)
      .get() as Observable<DocumentSnapshot<profileFromDatabase>>;

    return this.hasProfile(uid).pipe(
      filter((hasProfile) => !hasProfile), // continue only if profile is not in store
      exhaustMap(() =>
        profileSnapshot$.pipe(
          this.errorHandler.convertErrors("firestore"),
          this.errorHandler.handleErrors()
        )
      ), // fetch profile from database
      map((doc) => {
        if (!doc.exists) return;

        return this.format.profileDatabaseToClass(uid, doc.data());
      }), // modify format
      exhaustMap((profile) => {
        if (!!profile) return this.addPictureCount(profile);

        return EMPTY;
      }), // fetching the picture count for the profile
      exhaustMap((profile) => {
        if (!!profile) return this.saveProfile(profile);

        return EMPTY;
      }), // save profile to store
      exhaustMap((profile) => {
        if (!!profile) return this.getPictureUrls(uid);

        return EMPTY;
      }), // fetch pictures
      exhaustMap((pictures) => {
        if (!!pictures) return this.addProfilePictures(uid, pictures);

        return EMPTY;
      }) // save pictures to store
    );
  }

  /**
   * returns an observable of a boolean indicating whether the profile with uid "uid" is
   * in the store
   */
  private hasProfile(uid: string): Observable<boolean> {
    return this.profiles$.pipe(
      map((holder) => {
        if (holder.hasOwnProperty(uid) && holder[uid]) return true;
        return false;
      })
    );
  }

  private addProfilePictures(
    uid: string,
    pictures: string[]
  ): Observable<{ uid: string; pictures: string[] }> {
    return this.profiles$.pipe(
      take(1),
      map((holder) => {
        holder[uid].pictureUrls = pictures;

        this.profiles.next(holder);
        return { uid, pictures };
      })
    );
  }

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
  private getPictureUrls(uid: string): Observable<string[]> {
    return this.afStorage
      .ref("/profilePictures/" + uid)
      .listAll()
      .pipe(
        exhaustMap((list) => forkJoin(list.items.map((i) => i.getDownloadURL()))),
        this.errorHandler.convertErrors("firebase-storage"),
        this.errorHandler.handleErrors()
      );
  }

  // This was copied and adapted straight from the currentUserStore on January 4th 2022
  addPictureCount(profile: Profile): Observable<Profile> {
    return this.afStorage
      .ref("/profilePictures/" + profile.uid)
      .listAll()
      .pipe(
        first(),
        map((list) => list.items.length),
        tap((count) => (profile.pictureCount = count)),
        map(() => profile),
        this.errorHandler.convertErrors("firebase-storage"),
        this.errorHandler.handleErrors()
      );
  }
}
