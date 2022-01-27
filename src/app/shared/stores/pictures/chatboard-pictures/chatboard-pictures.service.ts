import { Injectable, Renderer2, RendererFactory2 } from "@angular/core";
import { SafeUrl } from "@angular/platform-browser";
import { AngularFireStorage } from "@angular/fire/storage";

import { Storage } from "@capacitor/storage";
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

import { Chat } from "../../../classes/chat.class";
import { GlobalErrorHandler } from "@services/errors/global-error-handler.service";
import { AbstractStoreService } from "@interfaces/stores.model";
import { ChatboardStore } from "@stores/index";
import { StoreResetter } from "@services/global-state-management/store-resetter.service";

export interface pictureHolder {
  [uid: string]: string;
}

@Injectable({
  providedIn: "root",
})
export class ChatboardPicturesStore extends AbstractStoreService {
  private uidsStorageKey = "chatboard_picture_uids";
  private picture_width = 300;
  private picture_height = 300;
  private renderer: Renderer2;

  private holder: BehaviorSubject<pictureHolder> = new BehaviorSubject({});
  protected isReady = new BehaviorSubject<boolean>(false);
  isReady$ = this.isReady.asObservable().pipe(distinctUntilChanged());

  holder$: Observable<pictureHolder> = this.holder.asObservable();

  private storageKey(uid: string): string {
    return "chatboard_picture_" + uid;
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

  constructor(
    private rendererFactory: RendererFactory2,
    private afStorage: AngularFireStorage,
    private chatboardStore: ChatboardStore,

    private errorHandler: GlobalErrorHandler,
    protected resetter: StoreResetter
  ) {
    super(resetter);
    this.renderer = this.rendererFactory.createRenderer(null, null);
  }

  protected systemsToActivate(): Observable<any> {
    return combineLatest([
      this.activateHolderFillingLogic(this.chatboardStore.allChats$),
      this.activateReadinessListener(
        this.chatboardStore.allChats$,
        this.chatboardStore.hasNoChats$
      ),
    ]);
  }

  protected resetStore(): void {
    this.isReady.next(false);
    this.holder.next({});

    console.log("chatboard-pictures store reset.");
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
    return ref
      .getDownloadURL()
      .pipe(
        this.errorHandler.convertErrors("firebase-storage"),
        this.errorHandler.handleErrors()
      );
  }
}
