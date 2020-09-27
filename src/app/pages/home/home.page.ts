import { Component, OnDestroy, OnInit } from "@angular/core";
import { ModalController } from "@ionic/angular";

import { Observable, Subscription } from "rxjs";

import { SearchCriteriaComponent } from "./search-criteria/search-criteria.component";

import { SearchCriteriaStore, SwipeStackStore } from "@stores/index";
import { profileSnapshot, SCriteria } from "@interfaces/index";

@Component({
  selector: "app-home",
  templateUrl: "home.page.html",
  styleUrls: ["home.page.scss"],
})
export class HomePage implements OnInit, OnDestroy {
  swipeProfiles: Observable<profileSnapshot[]>;

  private searchCriteria: SCriteria = {};
  private searchCriteria$: Subscription;

  constructor(
    private swipeStackStore: SwipeStackStore,
    private SCstore: SearchCriteriaStore,
    private modalCtrl: ModalController
  ) {}

  ngOnInit() {
    this.searchCriteria$ = this.SCstore.searchCriteria.subscribe((SC) => {
      this.searchCriteria = SC;
    });
    // this.swipeStackStore.updateSwipeStack(this.searchCriteria);
    this.swipeProfiles = this.swipeStackStore.profiles;
  }

  async presentSearchCriteria(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: SearchCriteriaComponent,
    });
    return await modal.present();
  }

  ngOnDestroy() {
    this.searchCriteria$.unsubscribe();
  }
}
