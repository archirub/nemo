import { Chat } from "../../../classes/chat.class";
import { Injectable } from "@angular/core";
import { AngularFireStorage } from "@angular/fire/storage";
import { BehaviorSubject, forkJoin, from, iif, Observable, of } from "rxjs";
import {
  concatMap,
  exhaustMap,
  map,
  switchMap,
  take,
  tap,
  withLatestFrom,
} from "rxjs/operators";
import { urlToBase64, Base64ToUrl } from "../common-pictures-functions";
import { Plugins } from "@capacitor/core";
import { ChatStore } from "@stores/index";
const { Storage } = Plugins;

export interface pictureHolder {
  [uid: string]: string;
}

// next to do:
// - link up this system to the chatboard pictures (by simply subscribing to the holder there)
// - design a system such that, if some pictures are not in "getAllPicturesFromLocalToHolder", then they are fetched
// and put in the local storage and displayed. In this case, we will only be fetching the first picture
// (most likely, the user will not click on the profile so only the first picture is necessary. In this case,
// I believe it is *not* even worth *storing* it in the others-pictures store, it will make the logic too complex
// as not all url arrays will contain all of the pictures of each user.
// - for the others-pictures, not only we need the pictures but also to store their profile! So might as well
// just have a store for profiles instead of just pictures. There will be logic to fetch pictures, but they will only be
// going to the pictureUrls array of each profile. Hence this step is about developing a store for storing others profiles,
// the profile store.

@Injectable({
  providedIn: "root",
})
export class ChatboardPicturesStore {
  private uidsStorageKey = "chatboard_picture_uids";

  private picture_width = 300;
  private picture_height = 300;

  private holder: BehaviorSubject<pictureHolder> = new BehaviorSubject({});
  holder$: Observable<pictureHolder> = this.holder.asObservable();

  constructor(private chatStore: ChatStore, private afStorage: AngularFireStorage) {}

  /**
   * Gotta subscribe to this to activate the chain of logic that fills the store etc.
   */
  activateStore(chats: Observable<Chat[]>): Observable<string[]> {
    return chats.pipe(
      concatMap((chats) => {
        // gets all pictures from local if the holder is empty
        if (Object.keys(chats).length === 0) {
          return this.getAllPicturesFromLocalToHolder().pipe(switchMap(() => of(chats)));
        }
        return of(chats);
      }),
      // the logic below is all for checking whether all of the chatboard pictures are present
      // and if not to get them from the database, display them and store them locally
      withLatestFrom(this.holder$),
      concatMap(([chats, holder]) => {
        let uidsToAdd: string[] = [];
        const uidsContained = Object.keys(holder);

        chats.forEach((chat) => {
          const index = uidsContained.indexOf(chat.recipient.uid);
          if (index === -1) {
            uidsToAdd.push(chat.recipient.uid);
          }
        });

        const pictureAdditions$ = uidsToAdd.map((uid) =>
          this.fetchMainPicture(uid).pipe(
            withLatestFrom(this.holder$),
            concatMap(([pictureUrl, pictureHolder]) => {
              pictureHolder[uid] = pictureUrl;
              this.holder.next(pictureHolder);
              return this.storeInLocal(uid, pictureUrl, true);
            })
          )
        );

        return forkJoin(pictureAdditions$).pipe(
          tap((content) => console.log("Picture added and stored locally:", content))
        );
      })
    );
  }

  storageKey(uid: string): string {
    return "chatboard_picture_" + uid;
  }

  storeInLocal(
    uid: string,
    pictureUrl: string,
    setQuality: boolean = true
  ): Observable<string> {
    return urlToBase64(pictureUrl).pipe(
      take(1),
      concatMap((base64Picture) =>
        iif(() => setQuality, this.setPictureQuality(base64Picture), of(base64Picture))
      ),
      concatMap((pic) => {
        const storePicture$ = from(
          Storage.set({
            key: this.storageKey(uid),
            value: JSON.stringify(pic),
          })
        );
        const storeUid$ = this.storeUid(uid);
        return forkJoin([storeUid$, storePicture$]);
      }),
      map(() => uid)
    );
  }

  getAllPicturesFromLocalToHolder(): Observable<string[][]> {
    return this.getUidsLocal().pipe(
      switchMap((uids: string[]) => {
        // must do so so that we have a stream with both the uids and the urls,
        // not just the urls
        const uids$ = of(uids);
        const urls$ = uids.map((uid) => this.getPictureLocal(uid));
        return forkJoin([uids$, forkJoin(urls$)]);
      }),
      concatMap(([uids, urls]) => this.addToHolder({ uids, urls }))
    );
  }

  addToHolder(obj: { uids: string[]; urls: string[] }): Observable<string[][]> {
    return this.holder$.pipe(
      take(1),
      map((holder) => {
        Array(obj.uids.length)
          .fill(null)
          .map((_, i) => {
            holder[obj.uids[i]] = obj.urls[i];
          });
        this.holder.next(holder);

        return [obj.uids, obj.urls];
      })
    );
  }

  setPictureQuality(
    base64Picture: string,
    width: number = this.picture_width,
    height: number = this.picture_height
  ): Observable<string> {
    const promise = new Promise((resolve, reject) => {
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      const img = document.createElement("img");

      canvas.style.width = width.toString() + "px";
      canvas.style.height = height.toString() + "px";

      img.src = base64Picture;
      img.onload = function () {
        context.scale(width / img.width, height / img.height);
        context.drawImage(img, 0, 0);
        resolve(canvas.toDataURL());
      };
    });

    return from(promise as Promise<string>);
  }

  getPictureLocal(uid: string): Observable<string> {
    return from(Storage.get({ key: this.storageKey(uid) })).pipe(
      take(1),
      map((res) => JSON.parse(res.value)),
      concatMap((base64Picture) => Base64ToUrl(base64Picture))
    );
  }

  getUidsLocal(): Observable<string[]> {
    return from(Storage.get({ key: this.uidsStorageKey })).pipe(
      take(1),
      map((res) => JSON.parse(res.value) || [])
    );
  }

  storeUid(uid: string): Observable<any> {
    return this.getUidsLocal().pipe(
      switchMap((uids) => {
        if (uids.indexOf(uid) !== -1) return of("");

        uids.push(uid);

        return from(
          Storage.set({ key: this.uidsStorageKey, value: JSON.stringify(uids) })
        );
      })
    );
  }

  fetchMainPicture(uid: string): Observable<string> {
    const refString = "/profilePictures/" + uid + "/" + 0;
    const ref = this.afStorage.ref(refString);
    return ref.getDownloadURL() as Observable<string>;
  }
}
