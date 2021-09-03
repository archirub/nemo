import { Chat } from "../../../classes/chat.class";
import { Injectable } from "@angular/core";
import { AngularFireStorage } from "@angular/fire/storage";
import {
  BehaviorSubject,
  combineLatest,
  forkJoin,
  from,
  iif,
  Observable,
  of,
} from "rxjs";
import {
  concatMap,
  distinctUntilChanged,
  exhaustMap,
  map,
  share,
  switchMap,
  take,
  tap,
  withLatestFrom,
} from "rxjs/operators";
import { urlToBase64, Base64ToUrl } from "../common-pictures-functions";
import { Plugins } from "@capacitor/core";
import { ChatboardStore } from "@stores/index";
const { Storage } = Plugins;
import { DomSanitizer, SafeUrl } from "@angular/platform-browser";

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

  private allPicturesLoaded = new BehaviorSubject<boolean>(false);
  allPicturesLoaded$ = this.allPicturesLoaded.asObservable().pipe(
    distinctUntilChanged(),
    map((val) => (this.hasNoChats ? true : val))
  );

  private hasNoChats: boolean = false;

  constructor(private afStorage: AngularFireStorage) {}

  /**
   * Gotta subscribe to this to activate the chain of logic that fills the store etc.
   */
  public activateStore(
    chats: Observable<{ [chatID: string]: Chat }>,
    hasNoChats: Observable<boolean>
  ): Observable<any> {
    return combineLatest([
      this.activateHolderFillingLogic(chats),
      this.activateLoadingListener(chats),
      this.activateHasNoChatsListener(hasNoChats),
    ]).pipe(
      // tap(() => console.log("activating chatboard pictures store")),
      share()
    );
  }

  public storeInLocal(
    uid: string,
    pictureUrl: string,
    setQuality: boolean = true
  ): Observable<string> {
    return urlToBase64(pictureUrl).pipe(
      take(1),
      concatMap((base64Picture) =>
        // UNTIL SETPICTUREQUALITY IS FUNCTIONAL
        // iif(() => setQuality, this.setPictureQuality(base64Picture), of(base64Picture))
        of(base64Picture)
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

  public addToHolder(obj: { uids: string[]; urls: string[] }): Observable<string[][]> {
    return this.holder$.pipe(
      take(1),
      // tap(() => {
      //   obj.urls = this.getTrustedUrl(obj.urls as string[]);
      //   console.log("trusted urls", obj.urls);
      // }),
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

  // private getTrustedUrl(urls: string[]): SafeUrl[] {
  //   return urls.map(
  //     (url) =>
  //       (this.DomSanitizer.bypassSecurityTrustUrl(url) as any)
  //         .changingThisBreaksApplicationSecurity
  //   );
  // }

  private activateHasNoChatsListener(hasNoChats: Observable<boolean>): Observable<void> {
    return hasNoChats.pipe(
      map((noChats) => {
        if (noChats) {
          this.hasNoChats = true;
          this.allPicturesLoaded.next(true);
        }
      })
    );
  }

  private activateLoadingListener(
    chats: Observable<{ [chatID: string]: Chat }>
  ): Observable<void> {
    return combineLatest([chats, this.holder$]).pipe(
      map(([chats, pictureHolder]) => {
        let allPicturesLoaded = true;

        // if there are no chats to be checked (otherwise it will give true)
        if (Object.keys(chats).length === 0) {
          allPicturesLoaded = false;
        } else {
          Object.values(chats).forEach((chat) => {
            if (!pictureHolder[chat.recipient.uid]) {
              allPicturesLoaded = false;
            }
          });
        }

        this.allPicturesLoaded.next(allPicturesLoaded);
      })
    );
  }

  private activateHolderFillingLogic(
    chats: Observable<{ [chatID: string]: Chat }>
  ): Observable<string[]> {
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

        Object.values(chats).forEach((chat) => {
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
              return of(uid); // for testing without storage
              // return this.storeInLocal(uid, pictureUrl, true);
            })
          )
        );

        return forkJoin(pictureAdditions$);
      })
    );
  }

  private storageKey(uid: string): string {
    return "chatboard_picture_" + uid;
  }

  private getAllPicturesFromLocalToHolder(): Observable<SafeUrl[][]> {
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

  private setPictureQuality(
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
        // context.scale(width / img.width, width / img.height);
        context.drawImage(img, 0, 0);
        resolve(canvas.toDataURL());
      };
    });

    return from(promise as Promise<string>);

    // console.log('width: ' + loadedData.width + ' height: ' + loadedData.height);

    // var result_image = document.getElementById('result_compress_image');
    // var quality = parseInt(encodeQuality.value);
    // console.log("Quality >>" + quality);

    // console.log("process start...");
    // var time_start = new Date().getTime();

    // var mime_type = "image/jpeg";
    // if (typeof output_format !== "undefined" && output_format == "png") {
    //   mime_type = "image/png";
    // }

    // var cvs = document.createElement('canvas');
    // cvs.width = loadedData.width;
    // cvs.height = loadedData.height;
    // var ctx = cvs.getContext("2d").drawImage(loadedData, 0, 0);
    // var newImageData = cvs.toDataURL(mime_type, quality / 100);
    // var result_image_obj = new Image();
    // result_image_obj.src = newImageData;
    // result_image.src = result_image_obj.src;

    // result_image.onload = function() {}
    // var duration = new Date().getTime() - time_start;

    // console.log("process finished...");
    // console.log('Processed in: ' + duration + 'ms');
  }

  private getPictureLocal(uid: string): Observable<string> {
    return from(Storage.get({ key: this.storageKey(uid) })).pipe(
      take(1),
      map((res) => JSON.parse(res.value)),
      concatMap((base64Picture) => Base64ToUrl(base64Picture))
    );
  }

  private getUidsLocal(): Observable<string[]> {
    return from(Storage.get({ key: this.uidsStorageKey })).pipe(
      take(1),
      map((res) => JSON.parse(res.value) || [])
    );
  }

  private storeUid(uid: string): Observable<any> {
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

  private fetchMainPicture(uid: string): Observable<string> {
    const refString = "/profilePictures/" + uid + "/" + 0;
    const ref = this.afStorage.ref(refString);
    return ref.getDownloadURL() as Observable<string>;
  }
}
