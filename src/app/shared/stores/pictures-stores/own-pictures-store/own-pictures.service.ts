import { Injectable } from "@angular/core";
import { AngularFireStorage } from "@angular/fire/storage";
import { AngularFireAuth } from "@angular/fire/auth";
import { Plugins } from "@capacitor/core";
const { Storage } = Plugins;

import { BehaviorSubject, combineLatest, forkJoin, from, Observable, of } from "rxjs";
import {
  distinctUntilChanged,
  filter,
  map,
  share,
  skipWhile,
  switchMap,
  take,
  tap,
  withLatestFrom,
} from "rxjs/operators";

import {
  Base64ToUrl,
  firebaseStoragePath,
  urlToBase64,
} from "../common-pictures-functions";
import { CurrentUserStore } from "@stores/index";
import { AngularFirestore } from "@angular/fire/firestore";

interface ownPicturesStorage {
  [position: number]: string;
}

@Injectable({
  providedIn: "root",
})
export class OwnPicturesStore {
  private localStorageKey: string = "own_pictures";

  private urls: BehaviorSubject<string[]> = new BehaviorSubject([]);
  urls$: Observable<string[]> = this.urls.asObservable();

  private allPicturesLoaded = new BehaviorSubject<boolean>(false);
  allPicturesLoaded$ = this.allPicturesLoaded.asObservable().pipe(distinctUntilChanged());

  constructor(
    private afStorage: AngularFireStorage,
    private afAuth: AngularFireAuth,
    private currentUser: CurrentUserStore,
    private firestore: AngularFirestore
  ) {}

  /**
   * Subscribe to this method to activate the logic that manages the store
   */
  activateStore(): Observable<any> {
    return combineLatest([
      this.activateHolderFillingLogic(),
      this.activateLoadingListener(),
    ]).pipe(
      // tap(() => console.log("activating own pictures store")),
      share()
    );
  }

  activateHolderFillingLogic() {
    return combineLatest([this.urls$, this.getOwnPictureCount()]).pipe(
      filter(([currentUrls, pictureCount]) => {
        const currentUrlCount = currentUrls.filter(
          (url) => typeof url === "string"
        ).length;
        return currentUrlCount !== pictureCount;
      }),
      switchMap(([currentUrls, pictureCount]) =>
        combineLatest([this.checkLocal(), of(pictureCount)])
      ),
      switchMap(([localStorageContent, pictureCount]) => {
        // dangerous logic as, when changing pictures, if the request to the database works but not that to
        // the local storage, then we will indefinitely be displaying the pictures from the local storage (i.e. the old pictures),
        // hence, either we need to make sure that the of the local storage gets updated if the database one does,
        // or we need to check for consistency every once in a while by fetching the user's pics from the database
        if (localStorageContent) {
          const localPictureCount = Object.keys(localStorageContent).length;
          if (localPictureCount === pictureCount)
            return this.nextFromLocal(localStorageContent);
        }

        return this.nextFromFirebase().pipe(switchMap((urls) => this.storeInLocal(urls)));
      })
    );
  }

  activateLoadingListener() {
    return combineLatest([this.urls$, this.getOwnPictureCount()]).pipe(
      map(([urls, pictureCount]) => {
        if (urls.filter(Boolean).length === pictureCount)
          return this.allPicturesLoaded.next(true);
        return this.allPicturesLoaded.next(false);
      })
    );
  }

  checkLocal(): Observable<ownPicturesStorage | null> {
    return from(Storage.get({ key: this.localStorageKey })).pipe(
      take(1),
      map((v) => JSON.parse(v.value))
    );
  }

  storeInLocal(urls: string[]): Observable<void> {
    // format based on the assumption that the urlToBase64() function doesn't get executed right away
    // as "base64Pictures" gets defined (as that would then happen one after the other), but that it does
    // if forkJoin below (as that would then happen in parallel)
    const base64Pictures$: Array<Observable<string>> = urls.map((url) =>
      urlToBase64(url)
    );

    return forkJoin(base64Pictures$).pipe(
      take(1),
      map((base64Pictures) => {
        let storageObject: ownPicturesStorage = {};
        base64Pictures.forEach((v, i) => {
          storageObject[i] = v;
        });
        return storageObject;
      }),
      switchMap((storageObject) =>
        Storage.set({
          key: this.localStorageKey,
          value: JSON.stringify(storageObject),
        })
      )
    );
  }

  nextFromLocal(storedObject: ownPicturesStorage): Observable<string[]> {
    const pictureCount = Object.keys(storedObject).length;

    let urlArray$: Observable<string>[] = Object.keys(storedObject).map((key) =>
      Base64ToUrl(storedObject[key])
    );

    return forkJoin(urlArray$).pipe(
      take(1),
      tap((urls) => this.urls.next(urls))
    );
  }

  nextFromFirebase(): Observable<string[]> {
    const uid$: Observable<string> = this.afAuth.user.pipe(map((user) => user?.uid));
    const pictureCount$: Observable<number> = this.getOwnPictureCount();

    // here we are using the switchMap operator (instead of concatMap or mergeMap for ex) as it allows
    // to, if either uid$ or pictureCount$ gets a new value, cancel the current profile picture fetching
    // right away and start a new fetch with the new value. THis is also why take(1) comes after switchMap,
    // that way, we only take(1) after we got the profilePictures
    return combineLatest([uid$, pictureCount$]).pipe(
      filter(([uid, pictureCount]) => !!uid),
      switchMap(([uid, pictureCount]) => this.fetchProfilePictures(uid, pictureCount)),
      take(1),
      tap((urls) => this.urls.next(urls))
    );
  }

  fetchProfilePictures(uid: string, pictureCount: number): Observable<string[]> {
    let urlArray$: Observable<string>[] = Array.from({ length: pictureCount }).map(
      (v, index) =>
        this.afStorage.ref(firebaseStoragePath(uid, index)).getDownloadURL().pipe(take(1)) // ensures it completes
    );
    return forkJoin(urlArray$);
  }

  getOwnPictureCount(): Observable<number> {
    return this.currentUser.user$.pipe(
      skipWhile((user) => user === null), // since behaviorSubject can hold null before it is initialised
      map((user) => user?.pictureCount),
      filter((count) => !!count),
      distinctUntilChanged()
    );
  }

  removePicture(index: number): Observable<void> {
    return this.afAuth.user.pipe(
      take(1),
      switchMap(async (user) => {
        if (!user) return;
        const filePath = `profilePictures/${user.uid}/${index}`;
        const ref = this.afStorage.ref(filePath);
        return ref.delete();
      }),
      withLatestFrom(this.urls$),
      switchMap(([_, urls]) => {
        urls.splice(index, 1);

        const newPictureCount = urls.filter(Boolean).length;

        return this.currentUser
          .updatePictureCount(newPictureCount)
          .pipe(map(() => this.urls.next(urls)));
      })
    );
  }

  addOrUpdatePicture(photoUrl: string, index: number): Observable<void> {
    return this.afAuth.user.pipe(
      take(1),
      switchMap(async (user) => {
        if (!user) return;

        const filePath = `profilePictures/${user.uid}/${index}`;
        const ref = this.afStorage.ref(filePath);

        return fetch(photoUrl)
          .then((res) => res.blob())
          .then((blob) => ref.put(blob));
      }),
      withLatestFrom(this.urls$),
      switchMap(([_, urls]) => {
        urls[index] = photoUrl;

        const newPictureCount = urls.filter(Boolean).length;

        return this.currentUser
          .updatePictureCount(newPictureCount)
          .pipe(map(() => this.urls.next(urls)));
      })
    );
  }

  switchPicturesOrder(index1: number, index2: number): Observable<void> {
    return this.afAuth.user.pipe(
      withLatestFrom(this.urls$),
      take(1),
      switchMap(async ([user, urls]) => {
        if (!user || !index1 || !index2) return;

        const filePath1 = `profilePictures/${user.uid}/${index1}`;
        const ref1 = this.afStorage.ref(filePath1);

        const filePath2 = `profilePictures/${user.uid}/${index2}`;
        const ref2 = this.afStorage.ref(filePath2);

        const upload1 = fetch(urls[index2])
          .then((res) => res.blob())
          .then((blob) => ref1.put(blob));

        const upload2 = fetch(urls[index1])
          .then((res) => res.blob())
          .then((blob) => ref2.put(blob));

        await Promise.all([upload1, upload2]);

        return urls;
      }),
      map((urls) => {
        [urls[index1], urls[index2]] = [urls[index2], urls[index1]];
        this.urls.next(urls);
      })
    );
  }
}
