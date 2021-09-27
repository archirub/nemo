import { Injectable } from "@angular/core";

import { OwnPicturesStore } from "@stores/pictures/own-pictures/own-pictures.service";
import { ChatboardStore } from "@stores/chatboard/chatboard-store.service";

import { SearchCriteriaStore } from "@stores/search-criteria/search-criteria-store.service";
import { SwipeStackStore } from "@stores/swipe-stack/swipe-stack-store.service";
import { CurrentUserStore } from "@stores/current-user/current-user-store.service";
import { ChatboardPicturesStore } from "@stores/pictures/chatboard-pictures/chatboard-pictures.service";
import { combineLatest, Observable } from "rxjs";
import { map } from "rxjs/operators";

@Injectable({
  providedIn: "root",
})
export class PageReadinessService {
  constructor(
    private userStore: CurrentUserStore,
    private chatboardStore: ChatboardStore,
    private chatboardPicturesStore: ChatboardPicturesStore,
    private swipeStackStore: SwipeStackStore,
    private OwnPicturesStore: OwnPicturesStore,
    private searchCriteriaStore: SearchCriteriaStore
  ) {}

  get app$() {
    const storesToCheck$: Observable<boolean>[] = [
      this.userStore.isReady$,
      this.swipeStackStore.isReady$,
      this.searchCriteriaStore.isReady$,
      this.chatboardStore.isReady$,
      this.chatboardPicturesStore.isReady$,
      this.OwnPicturesStore.isReady$,
    ];
    return combineLatest(storesToCheck$).pipe(
      map((arr) => arr.reduce((prev, curr) => (curr === false ? curr : prev)))
    );
  }

  get home$() {
    const storesToCheck$: Observable<boolean>[] = [
      this.userStore.isReady$,
      this.swipeStackStore.isReady$,
      this.searchCriteriaStore.isReady$,
    ];
    return combineLatest(storesToCheck$).pipe(
      map((arr) => arr.reduce((prev, curr) => (curr === false ? curr : prev)))
    );
  }

  get chats$() {
    const storesToCheck$: Observable<boolean>[] = [
      this.userStore.isReady$,
      this.chatboardStore.isReady$,
      this.chatboardPicturesStore.isReady$,
    ];
    return combineLatest(storesToCheck$).pipe(
      map((arr) => arr.reduce((prev, curr) => (curr === false ? curr : prev)))
    );
  }

  get ownProfile$() {
    const storesToCheck$: Observable<boolean>[] = [
      this.userStore.isReady$,
      this.OwnPicturesStore.isReady$,
    ];
    return combineLatest(storesToCheck$).pipe(
      map((arr) => arr.reduce((prev, curr) => (curr === false ? curr : prev)))
    );
  }
}
