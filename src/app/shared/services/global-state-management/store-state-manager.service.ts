import { Injectable } from "@angular/core";

import { StoreResetter } from "@services/global-state-management/store-resetter.service";

import {
  SwipeOutcomeStore,
  CurrentUserStore,
  ChatboardStore,
  SwipeStackStore,
  SearchCriteriaStore,
} from "@stores/index";
import { NotificationsStore } from "@stores/notifications/notifications.service";
import { ChatboardPicturesStore } from "@stores/pictures/chatboard-pictures/chatboard-pictures.service";
import { OwnPicturesStore } from "@stores/pictures/own-pictures/own-pictures.service";
import { TutorialsStore } from "@stores/tutorials/tutorials.service";
import { UniversitiesStore } from "@stores/universities/universities.service";
import { combineLatest, map, Observable, of, Subscription } from "rxjs";

@Injectable({
  providedIn: "root",
})
export class StoreStateManager {
  // subscriptions
  private userRelatedSub: Subscription = null;
  private defaultSub: Subscription = null;
  private resetListenerSub: Subscription = null;

  // observables
  private get default$() {
    return combineLatest([this.universitiesStore.activate$]);
  }
  private get userRelated$() {
    return combineLatest([
      this.notificationsStore.activate$,
      this.tutorialsStore.activate$,
      this.userStore.activate$,
      this.swipeStackStore.activate$,
      this.searchCriteriaStore.activate$,
      this.chatboardStore.activate$,
      this.OwnPicturesStore.activate$,
      this.chatboardPicturesStore.activate$,
      // this.swipeCapStore.activate$
    ]);
  }
  private resetListener$ = this.storeResetter.deactivateOnEmit$.pipe(
    map(() => this.deactivateComponent(this.userRelatedSub))
  );

  constructor(
    private storeResetter: StoreResetter,
    private notificationsStore: NotificationsStore,
    private tutorialsStore: TutorialsStore,
    private swipeOutcomeStore: SwipeOutcomeStore,
    private userStore: CurrentUserStore,
    private chatboardStore: ChatboardStore,
    private chatboardPicturesStore: ChatboardPicturesStore,
    private swipeStackStore: SwipeStackStore,
    private OwnPicturesStore: OwnPicturesStore,
    private universitiesStore: UniversitiesStore,
    private searchCriteriaStore: SearchCriteriaStore
  ) {}

  /**
   * actions to do when the app becomes inactive
   */
  public onInactiveAppState() {
    this.swipeOutcomeStore.registerSwipeChoices$.subscribe();
  }

  public activateDefault() {
    console.log("activateDefault");
    this.activateComponent(this.default$, this.defaultSub);
  }

  public activateUserDependent() {
    console.log("activateUserDependent");
    this.activateComponent(this.userRelated$, this.userRelatedSub);
    this.activateComponent(this.resetListener$, this.resetListenerSub);
  }

  private activateComponent(obs$: Observable<any>, sub: Subscription) {
    if (sub) return;
    sub = obs$.subscribe();
  }

  private deactivateComponent(sub: Subscription) {
    console.log("deactivateComponent");
    sub?.unsubscribe();
    sub = null;
  }
}
