import { Injectable } from "@angular/core";
import { AbstractStoreService } from "@interfaces/stores.model";

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

interface Subs {
  userDependentActivate$: Subscription;
  userDependentReset$: Subscription;
  defaultActivate$: Subscription;
  defaultReset$: Subscription;
  deactivationListener: Subscription;
}

interface Stores {
  default: AbstractStoreService[];
  userDependent: AbstractStoreService[];
}
@Injectable({
  providedIn: "root",
})
export class StoreStateManager {
  // subscriptions
  private subs: Subs = {
    userDependentActivate$: null,
    userDependentReset$: null,
    defaultActivate$: null,
    defaultReset$: null,
    deactivationListener: null,
  };

  private stores: Stores = {
    default: [this.universitiesStore],
    userDependent: [
      this.notificationsStore,
      this.tutorialsStore,
      this.userStore,
      this.swipeStackStore,
      this.searchCriteriaStore,
      this.chatboardStore,
      this.OwnPicturesStore,
      this.chatboardPicturesStore,
    ],
  };

  private activateStores$(storeType: keyof Stores): Observable<any> {
    return combineLatest(this.stores[storeType].map((store) => store.activate$));
  }

  private listenOnStoreResets$(storeType: keyof Stores): Observable<any> {
    return combineLatest(this.stores[storeType].map((store) => store.listenOnReset$));
  }

  // observables
  private listenOnUserDependentDeactivation$ = this.storeResetter.deactivateOnEmit$.pipe(
    map(() => this.deactivateComponent("userDependentActivate$"))
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
  public async onInactiveAppState() {
    return this.swipeOutcomeStore.registerSwipeChoices();
  }

  public activateDefault() {
    this.activateComponent(this.activateStores$("default"), "defaultReset$");
    this.activateComponent(this.listenOnStoreResets$("default"), "defaultReset$");
  }

  public activateUserDependent() {
    this.activateComponent(
      this.activateStores$("userDependent"),
      "userDependentActivate$"
    );
    this.activateComponent(
      this.listenOnStoreResets$("userDependent"),
      "userDependentReset$"
    );
    this.activateComponent(
      this.listenOnUserDependentDeactivation$,
      "deactivationListener"
    );
  }

  private activateComponent(obs$: Observable<any>, subName: keyof Subs) {
    if (this.subs[subName]) return;
    this.subs[subName] = obs$.subscribe();
  }

  private deactivateComponent(subName: keyof Subs) {
    this.subs[subName]?.unsubscribe();
    this.subs[subName] = null;
  }
}
