import { Injectable } from "@angular/core";

import { OwnPicturesStore } from "@stores/pictures/own-pictures/own-pictures.service";
import { ChatboardStore } from "@stores/chatboard/chatboard-store.service";

import { SearchCriteriaStore } from "@stores/search-criteria/search-criteria-store.service";
import { SwipeStackStore } from "@stores/swipe-stack/swipe-stack-store.service";
import { CurrentUserStore } from "@stores/current-user/current-user-store.service";
import { ChatboardPicturesStore } from "@stores/pictures/chatboard-pictures/chatboard-pictures.service";
import { combineLatest, Observable } from "rxjs";
import { distinctUntilChanged, map } from "rxjs/operators";
import { isEqual } from "lodash";

type storeName =
  | "user"
  | "chatboard"
  | "swipeStack"
  | "searchCriteria"
  | "userPictures"
  | "chatboardPictures";

@Injectable({
  providedIn: "root",
})
export class StoreReadinessService {
  constructor(
    private userStore: CurrentUserStore,
    private chatboardStore: ChatboardStore,
    private chatboardPicturesStore: ChatboardPicturesStore,
    private swipeStackStore: SwipeStackStore,
    private OwnPicturesStore: OwnPicturesStore,
    private searchCriteriaStore: SearchCriteriaStore
  ) {}

  status$: Observable<{ [key in storeName]: boolean }> = combineLatest([
    this.userStore.isReady$,
    this.swipeStackStore.isReady$,
    this.searchCriteriaStore.isReady$,
    this.chatboardStore.isReady$,
    this.chatboardPicturesStore.isReady$,
    this.OwnPicturesStore.isReady$,
  ]).pipe(
    map((arr) => ({
      user: arr[0],
      swipeStack: arr[1],
      searchCriteria: arr[2],
      chatboard: arr[3],
      chatboardPictures: arr[4],
      userPictures: arr[5],
    })),
    distinctUntilChanged((x, y) => isEqual(x, y))
  );

  app$ = combineLatest([
    this.userStore.isReady$,
    this.swipeStackStore.isReady$,
    // this.searchCriteriaStore.isReady$,
    // this.chatboardStore.isReady$,
    // this.chatboardPicturesStore.isReady$,
    // this.OwnPicturesStore.isReady$,
  ]).pipe(map((arr) => arr.reduce((prev, curr) => (curr === false ? curr : prev))));

  home$ = combineLatest([
    this.userStore.isReady$,
    this.swipeStackStore.isReady$,
    this.searchCriteriaStore.isReady$,
  ]).pipe(map((arr) => arr.reduce((prev, curr) => (curr === false ? curr : prev))));

  chats$ = combineLatest([
    this.userStore.isReady$,
    this.chatboardStore.isReady$,
    this.chatboardPicturesStore.isReady$,
  ]).pipe(map((arr) => arr.reduce((prev, curr) => (curr === false ? curr : prev))));

  ownProfile$ = combineLatest([
    this.userStore.isReady$,
    this.OwnPicturesStore.isReady$,
  ]).pipe(
    // tap((a) => console.log("ARRAY ownprofile is ready", a)),
    map((arr) => arr.reduce((prev, curr) => (curr === false ? curr : prev)))
    // tap((a) => console.log("VALUE ownprofile is ready", a))
  );
}
