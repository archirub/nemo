import { Chat } from "../../../classes/chat.class";
import { Injectable, Renderer2, RendererFactory2 } from "@angular/core";
import { AngularFireStorage } from "@angular/fire/storage";
import { BehaviorSubject, combineLatest, forkJoin, from, Observable, of } from "rxjs";
import {
  concatMap,
  distinctUntilChanged,
  map,
  share,
  switchMap,
  take,
  withLatestFrom,
} from "rxjs/operators";
import { urlToBase64, Base64ToUrl } from "../common-pictures-functions";
import { Storage } from "@capacitor/storage";

import { SafeUrl } from "@angular/platform-browser";

export interface pictureHolder {
  [uid: string]: string;
}

@Injectable({
  providedIn: "root",
})
export class ChatboardPicturesStore {
  private uidsStorageKey = "chatboard_picture_uids";

  private picture_width = 300;
  private picture_height = 300;

  private holder: BehaviorSubject<pictureHolder> = new BehaviorSubject({});
  holder$: Observable<pictureHolder> = this.holder.asObservable();

  private isReady = new BehaviorSubject<boolean>(false);
  public isReady$ = this.isReady.asObservable().pipe(distinctUntilChanged());

  private renderer: Renderer2;

  constructor(
    private afStorage: AngularFireStorage,
    private rendererFactory: RendererFactory2
  ) {
    this.renderer = this.rendererFactory.createRenderer(null, null);
  }

  /**
   * Gotta subscribe to this to activate the chain of logic that fills the store etc.
   */
  public activateStore(
    chats: Observable<{ [chatID: string]: Chat }>,
    hasNoChats: Observable<boolean>
  ): Observable<any> {
    return combineLatest([
      this.activateHolderFillingLogic(chats),
      this.activateReadinessListener(chats, hasNoChats),
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

  private activateReadinessListener(
    chats: Observable<{ [chatID: string]: Chat }>,
    hasNoChats: Observable<boolean>
  ) {
    const noChatsListener$ = hasNoChats.pipe(map((noChats) => noChats));
    const loadingListener$ = combineLatest([chats, this.holder$]).pipe(
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

        return allPicturesLoaded;
      })
    );

    return combineLatest([noChatsListener$, loadingListener$]).pipe(
      map(([noChats, allPicturesLoaded]) =>
        this.isReady.next(noChats || allPicturesLoaded)
      )
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

      this.renderer.setStyle(canvas, "width", width.toString() + "px");
      this.renderer.setStyle(canvas, "height", height.toString() + "px");

      img.src = base64Picture;
      img.onload = function () {
        // context.scale(width / img.width, width / img.height);
        context.drawImage(img, 0, 0);
        resolve(canvas.toDataURL());
      };
    });

    return from(promise as Promise<string>);

    // console.log('width: ' + loadedData.width + ' height: ' + loadedData.height);

    // const result_image = document.getElementById('result_compress_image');
    // const quality = parseInt(encodeQuality.value);
    // console.log("Quality >>" + quality);

    // console.log("process start...");
    // const time_start = new Date().getTime();

    // const mime_type = "image/jpeg";
    // if (typeof output_format !== "undefined" && output_format == "png") {
    //   mime_type = "image/png";
    // }

    // const cvs = document.createElement('canvas');
    // cvs.width = loadedData.width;
    // cvs.height = loadedData.height;
    // const ctx = cvs.getContext("2d").drawImage(loadedData, 0, 0);
    // const newImageData = cvs.toDataURL(mime_type, quality / 100);
    // const result_image_obj = new Image();
    // result_image_obj.src = newImageData;
    // result_image.src = result_image_obj.src;

    // result_image.onload = function() {}
    // const duration = new Date().getTime() - time_start;

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
