import { Injectable } from "@angular/core";
import { ChatboardStore } from "@stores/chatboard-store/chatboard-store.service";
import { SearchCriteriaStore } from "@stores/search-criteria-store/search-criteria-store.service";
import { OtherProfilesStore } from "@stores/other-profiles-store/other-profiles-store.service";
import { SwipeOutcomeStore } from "@stores/swipe-outcome-store/swipe-outcome-store.service";
import { SwipeStackStore } from "@stores/swipe-stack-store/swipe-stack-store.service";
import { SettingsStore } from "@stores/settings-store/settings-store.service";
import { CurrentUserStore } from "@stores/current-user-store/current-user-store.service";
import { ChatboardPicturesStore } from "@stores/pictures-stores/chatboard-pictures-store/chatboard-pictures.service";
import { OwnPicturesStore } from "@stores/pictures-stores/own-pictures-store/own-pictures.service";

// service created to solve a circular dependency between global-state-management service and
// firebase-auth service, where the latter only imported the former to use the emptyStores functionality

@Injectable({
  providedIn: "root",
})
export class EmptyStoresService {
  constructor(
    private userStore: CurrentUserStore,
    // private chatboardStore: ChatboardStore,
    // private chatboardPicturesStore: ChatboardPicturesStore,
    private searchCriteriaStore: SearchCriteriaStore,
    private otherProfilesStore: OtherProfilesStore,
    private swipeOutcomeStore: SwipeOutcomeStore,
    private swipeStackStore: SwipeStackStore,
    private settingsStore: SettingsStore // private OwnPicturesStore: OwnPicturesStore
  ) {}

  emptyStores() {
    this.userStore.resetStore();
    // this.chatboardStore.resetStore();
    this.searchCriteriaStore.resetStore();
    this.swipeOutcomeStore.resetStore();
    this.swipeStackStore.resetStore();
    this.otherProfilesStore.resetStore();
    this.settingsStore.resetStore();
    console.log("stores emptied");
    // ANY OTHERS / NEW ONES ? Add them here
  }
}
