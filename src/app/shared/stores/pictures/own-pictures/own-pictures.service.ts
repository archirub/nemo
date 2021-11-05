import { isEqual } from "lodash";
import { Injectable } from "@angular/core";
import { AngularFireStorage } from "@angular/fire/storage";
import { AngularFireAuth } from "@angular/fire/auth";
import { Storage } from "@capacitor/storage";

import { BehaviorSubject, combineLatest, forkJoin, from, Observable, of } from "rxjs";
import {
  concatMap,
  distinctUntilChanged,
  exhaustMap,
  filter,
  map,
  share,
  switchMap,
  take,
  tap,
} from "rxjs/operators";

import {
  Base64ToUrl,
  urlToBase64,
} from "../common-pictures-functions";
import { CurrentUserStore } from "@stores/index";

interface picturesMap {
  [position: number]: string;
}
interface ownPicturesStorage {
  timestamp: Date;
  pictures: picturesMap;
}

@Injectable({
  providedIn: "root",
})
export class OwnPicturesStore {
  private localStorageKey: string = "own_pictures";

  private MAX_STORAGE_TIME: number = 2 * 24 * 3600; // = 2 days in ms, completely arbitrary

  private urls: BehaviorSubject<string[]> = new BehaviorSubject([]);
  urls$: Observable<string[]> = this.urls.asObservable();

  private isReady = new BehaviorSubject<boolean>(false);
  isReady$ = this.isReady.asObservable().pipe(distinctUntilChanged());

  constructor(
    private afStorage: AngularFireStorage,
    private afAuth: AngularFireAuth,
    private currentUser: CurrentUserStore
  ) {}

  public activateStore$ = this.activateStore();

  /**
   * Subscribe to this method to activate the logic that manages the store
   */
  private activateStore(): Observable<any> {
    return combineLatest([this.fillStore(), this.activateLocalStorer()]).pipe(
      // tap(() => console.log("activating own pictures store")),
      share()
    );
  }

  updatePictures(newPicturesArray: string[]) {
    return this.urls$.pipe(
      take(1),
      map((urls) => {
        const currentArray = urls.filter(Boolean);
        const newArray = newPicturesArray.filter(Boolean);

        const tasks$: Observable<void>[] = [];
        // addition tasks
        newArray.forEach((newUrl, index) => {
          const currentUrl = currentArray[index];

          if (newUrl === currentUrl) return;

          tasks$.push(this.updatePictureInDatabase(newUrl, index));
        });

        // deleting tasks
        if (currentArray.length > newArray.length) {
          const startIndex = newArray.length;
          const deletesToDo = currentArray.length - newArray.length;
          const endIndex = startIndex + deletesToDo;
          const indexes = Array.from({ length: endIndex - startIndex + 1 }).map(
            (_, idx) => startIndex + idx
          );

          indexes.forEach((i) => tasks$.push(this.removePictureInDatabase(i)));
        }

        return tasks$;
      }),
      exhaustMap((tasks) => {
        if (tasks.length > 0)
          return forkJoin(tasks).pipe(
            map(() => this.urls.next(newPicturesArray.filter(Boolean)))
          );
        return of(""); // needs to be none null otherwise forkJoin doesn't get it
      })
    );
  }

  /**
   * Main logic of the store - fills the holder with picture from the local storage if
   * it isn't empty, and pictures from firebase if it is
   */
  private fillStore() {
    return this.checkLocal().pipe(
      exhaustMap((localStorageContent) => {
        if (
          localStorageContent &&
          this.localIsValid(new Date(localStorageContent.timestamp))
        )
          return this.nextFromLocal(localStorageContent.pictures);

        return this.nextFromFirebase();
      }),
      tap(() => this.isReady.next(true))
    );
  }

  /**
   * Listens on the urls obserable and stores the urls locally if they change
   */
  private activateLocalStorer(): Observable<void> {
    return this.urls$.pipe(
      filter((urls) => !!urls),
      distinctUntilChanged((x, y) => isEqual(x, y)),
      concatMap((urls) => this.storeInLocal(urls))
    );
  }

  private checkLocal(): Observable<ownPicturesStorage | null> {
    return from(Storage.get({ key: this.localStorageKey })).pipe(
      take(1),
      map((v) => JSON.parse(v.value))
    );
  }

  private storeInLocal(urls: string[]): Observable<void> {
    // format based on the assumption that the urlToBase64() function doesn't get executed right away
    // as "base64Pictures" gets defined (as that would then happen one after the other), but that it does
    // if forkJoin below (as that would then happen in parallel)

    const timestamp = new Date();

    const base64Pictures$: Array<Observable<string>> = urls.map((url) =>
      urlToBase64(url)
    );

    return forkJoin(base64Pictures$).pipe(
      take(1),
      map((base64Pictures) => {
        let storageObject: ownPicturesStorage = {
          timestamp,
          pictures: {},
        };
        base64Pictures.forEach((v, i) => {
          storageObject.pictures[i] = v;
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

  private nextFromLocal(pictures: picturesMap): Observable<string[]> {
    let urlArray$: Observable<string>[] = Object.keys(pictures).map((key) =>
      Base64ToUrl(pictures[key])
    );

    return forkJoin(urlArray$).pipe(
      take(1),
      tap((urls) => this.urls.next(urls))
    );
  }

  private nextFromFirebase(): Observable<string[]> {
    const uid$: Observable<string> = this.afAuth.user.pipe(
      map((user) => user?.uid),
      filter((uid) => !!uid),
      take(1)
    );

    // here we are using the switchMap operator (instead of concatMap or mergeMap for ex) as it allows
    // to, if either uid$ or pictureCount$ gets a new value, cancel the current profile picture fetching
    // right away and start a new fetch with the new value. THis is also why take(1) comes after switchMap,
    // that way, we only take(1) after we got the profilePictures
    return uid$.pipe(
      switchMap((uid) => this.fetchProfilePictures(uid)),
      tap((urls) => this.urls.next(urls))
    );
  }

  private fetchProfilePictures(uid: string): Observable<string[]> {
    return this.afStorage
      .ref("/profilePictures/" + uid)
      .listAll()
      .pipe(
        exhaustMap(
          (list) =>
            list?.items?.length > 0
              ? forkJoin(list.items.map((i) => i.getDownloadURL()))
              : of([]) // important, forkJoin never completes if it is given an empty array
        )
      );
  }

  private removePictureInDatabase(index: number): Observable<void> {
    return this.afAuth.user.pipe(
      take(1),
      switchMap((user) => {
        if (!user) return;
        const filePath = `profilePictures/${user.uid}/${index}`;
        const ref = this.afStorage.ref(filePath);

        return ref.delete();
      })
    );
  }

  private updatePictureInDatabase(photoUrl: string, index: number): Observable<void> {
    return this.afAuth.user.pipe(
      take(1),
      switchMap(async (user) => {
        if (!user) return;

        const filePath = `profilePictures/${user.uid}/${index}`;
        const ref = this.afStorage.ref(filePath);

        const response = await fetch(photoUrl);
        const blob = await response.blob();
        await ref.put(blob);
      })
    );
  }

  private localIsValid(timestamp: Date): boolean {
    if (!timestamp) return false;
    const now = new Date();
    const timeElapsed = now.getTime() - timestamp.getTime();
    return timeElapsed < this.MAX_STORAGE_TIME;
  }
}
