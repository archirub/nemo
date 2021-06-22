import { Injectable } from "@angular/core";
import { AngularFireStorage } from "@angular/fire/storage";
import { AngularFireAuth } from "@angular/fire/auth";
import { Plugins } from "@capacitor/core";
import { BehaviorSubject, combineLatest, forkJoin, from, Observable, of } from "rxjs";
import { filter, map, skipWhile, switchMap, take, tap } from "rxjs/operators";

import { Base64ToUrl, urlToBase64 } from "../common-functions";
import { CurrentUserStore } from "@stores/index";

interface ownPicturesStorage {
  [position: number]: string;
}

@Injectable({
  providedIn: "root",
})
export class OwnPicturesService {
  localStorageKey: string = "own_pictures";

  urls: BehaviorSubject<string[]> = new BehaviorSubject([]);
  urls$: Observable<string[]> = this.urls.asObservable();

  emptinessObserver$: Observable<any>;

  constructor(
    private afStorage: AngularFireStorage,
    private afAuth: AngularFireAuth,
    private currentUser: CurrentUserStore
  ) {
    this.emptinessObserver$ = combineLatest([this.urls$, this.getPictureCount()]).pipe(
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
          if (localPictureCount === pictureCount) console.log("yesyesyes");
          return this.nextFromLocal(localStorageContent);
        }

        return this.nextFromFirebase().pipe(switchMap((urls) => this.saveToLocal(urls)));
      })
    );
  }

  checkLocal(): Observable<ownPicturesStorage | null> {
    return from(Plugins.Storage.get({ key: this.localStorageKey })).pipe(
      take(1),
      map((v) => JSON.parse(v.value))
    );
  }

  saveToLocal(urls: string[]): Observable<void> {
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
        Plugins.Storage.set({
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
    const uid$: Observable<string> = this.afAuth.user.pipe(map((user) => user.uid));
    const pictureCount$: Observable<number> = this.getPictureCount();

    // here we are using the switchMap operator (instead of concatMap or mergeMap for ex) as it allows
    // to, if either uid$ or pictureCount$ gets a new value, cancel the current profile picture fetching
    // right away and start a new fetch with the new value. THis is also why take(1) comes after switchMap,
    // that way, we only take(1) after we got the profilePictures
    return combineLatest([uid$, pictureCount$]).pipe(
      switchMap(([uid, pictureCount]) => this.fetchProfilePictures(uid, pictureCount)),
      take(1),
      tap((urls) => this.urls.next(urls))
    );
  }

  fetchProfilePictures(uid: string, pictureCount: number): Observable<string[]> {
    let urlArray$: Observable<string>[] = Array.from({ length: pictureCount }).map(
      (v, index) =>
        this.afStorage
          .ref("/profilePictures/" + uid + "/" + index)
          .getDownloadURL()
          // ensures it completes
          .pipe(take(1))
    );
    return forkJoin(urlArray$);
  }

  getPictureCount(): Observable<number> {
    return this.currentUser.user$.pipe(
      skipWhile((user) => user === null),
      map((user) => user?.pictureCount)
    );
  }
}

// check storage
// if storage is non empty (meaning it at least contains one picture (later do it based on whether
//                          the number of pictures in contains matches the number of pictureCount in ownProfileStore ))
//    then take transform base64 to blob, create urls for the objects and pass these to the behaviorSubject
// if storage is empty then get pictureCount (so you need pictureCount regardless actually) and uid and fetch all of the user's pics from
// the Firebase storage, put them in behaviorSubject, and then convert them to base64 and store them in the local storage
