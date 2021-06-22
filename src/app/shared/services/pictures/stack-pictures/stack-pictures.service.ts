import { Injectable } from "@angular/core";

import { BehaviorSubject, Observable } from "rxjs";

import { SwipeStackStore } from "@stores/index";
import { AngularFireStorage } from "@angular/fire/storage";
import { take, tap } from "rxjs/operators";
import { Profile } from "@classes/index";

interface pictureObject {
  uid: string;
  urls: string[];
}

@Injectable({
  providedIn: "root",
})
export class StackPicturesService {
  pictures = new BehaviorSubject<pictureObject[]>([]);
  pictures$ = this.pictures.asObservable();

  constructor(
    private swipeStackStore: SwipeStackStore,
    private afStorage: AngularFireStorage
  ) {}

  // next to do:
  // - create logic such that, after addToPictures observable is triggered (so within that observable in the tap),
  // we have logic such that urls are downloaded from the database and added to the pictures subject in the right spot,
  // this needs to be done such that we load the pictures in a smart way, though maybe I should keep that for later as this is quite
  // difficult. Indeed, I want something like: all of the first pictures are loaded, along with the first 3 pics of the first 3-5 users,
  // and as the user gets further in the stack, more are loaded. As well, ideally, as the user starts swiping through the pics, more
  // of these pictures get loaded until the last one
  // - then create logic such that pictures are removed from the stack on removal of them
  // ([READ THIS FIRST] might be a problem particularly
  // since that must be done at exactly the same time since in the same stack. Yeah that's definitely a problem,
  // shit needs to be changed so that each profile is one object and contains the picture urls as well, so no separate behaviorSubject for them
  // DON'T FORGET TO CALL REVOKEOBJECTURL ONCE YOU DON'T NEED THEM ANYMORE
  //

  addToPictures(newProfiles: Profile[]): Observable<pictureObject[]> {
    return this.pictures$.pipe(
      take(1),
      tap((pictures) => {
        const newPictureObjects: pictureObject[] = newProfiles.map((p) => {
          return { uid: p.uid, urls: Array.from({ length: p.pictureCount }) };
        });
        this.pictures.next(pictures.concat(newPictureObjects));
      })
    );
  }

  removePicture(uid: string): Observable<pictureObject[]> {
    return this.pictures$.pipe(
      take(1),
      tap((pictures) => {
        if (!pictures) return;
        this.pictures.next(pictures.filter((p) => p.uid !== uid));
      })
    );
  }

  getUrl(uid: string, pictureIndex: number): Observable<string> {
    return this.afStorage
      .ref("profilePictures/" + uid + "/" + pictureIndex)
      .getDownloadURL();
  }

  addUrl(url: string, uid: string, pictureIndex: number): Observable<pictureObject[]> {
    return this.pictures$.pipe(
      take(1),
      tap((pictures) => {
        const userIndex = pictures.map((p) => p.uid).indexOf(uid);
        pictures[userIndex][pictureIndex] = url;
        this.pictures.next(pictures);
      })
    );
  }
}
