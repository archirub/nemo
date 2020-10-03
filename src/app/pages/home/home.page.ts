import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  HostListener,
} from "@angular/core";
import { AnimationController, ModalController } from "@ionic/angular";

import { Observable, Subscription } from "rxjs";
import { throttle, filter } from "rxjs/operators";

import { SearchCriteriaComponent } from "./search-criteria/search-criteria.component";

import { SearchCriteria } from "@classes/index";
import { SearchCriteriaStore, SwipeStackStore } from "@stores/index";
import { profileSnapshot, SCriteria } from "@interfaces/index";
import { SCenterAnimation, SCleaveAnimation } from "@animations/index";
import { TabElementRefService } from "src/app/tab-menu/tab-element-ref.service";
// import { enterAnimation, leaveAnimation } from "@animations/index";

@Component({
  selector: "app-home",
  templateUrl: "home.page.html",
  styleUrls: ["home.page.scss"],
})
export class HomePage implements OnInit, OnDestroy {
  swipeProfiles: Observable<profileSnapshot[]>;
  private swipeStackRefill$: Subscription;

  private searchCriteria: SearchCriteria = new SearchCriteria();
  private searchCriteria$: Subscription;

  // PROPERTIES FOR MODAL ANIMATION
  @ViewChild("homeContainer", { read: ElementRef }) homeContainer: ElementRef;
  @ViewChild("searchButton", { read: ElementRef }) searchButton: ElementRef;
  screenHeight: number;
  screenWidth: number;
  @HostListener("window:resize", ["$event"])
  onResize(event?) {
    this.screenHeight = window.innerHeight;
    this.screenWidth = window.innerWidth;
  }

  constructor(
    private swipeStackStore: SwipeStackStore,
    private SCstore: SearchCriteriaStore,
    private modalCtrl: ModalController,
    private animationCtrl: AnimationController,
    private tabElementRef: TabElementRefService
  ) {
    this.onResize();
  }

  ngOnInit() {
    this.swipeProfiles = this.swipeStackStore.profiles;
    this.searchCriteria$ = this.SCstore.searchCriteria.subscribe((SC) => {
      this.searchCriteria = SC;
    });

    // Makes sure swipe stack is only filled when its length is smaller or equal to a given
    // length, and that no new query to refill the swipe stack is made while a query
    // is already being processed.
    this.swipeStackRefill$ = this.swipeProfiles
      .pipe(
        filter((profiles) => profiles.length <= 4),
        throttle(
          async () =>
            await this.swipeStackStore.updateSwipeStack(
              this.SCclassToMap(this.searchCriteria)
            )
        )
      )

      .subscribe();
  }

  private SCclassToMap(SC: SearchCriteria): SCriteria {
    let map: SCriteria = {};
    for (const option in SC.options) {
      map[option] = SC[option];
    }
    return map;
  }

  async presentSCmodal(): Promise<void> {
    const enter = SCenterAnimation(
      this.searchButton,
      this.tabElementRef.tabRef,
      this.homeContainer,
      this.screenWidth,
      this.screenHeight
    );
    const leave = SCleaveAnimation(
      this.searchButton,
      this.tabElementRef.tabRef,
      this.homeContainer,
      this.screenWidth,
      this.screenHeight
    );

    const modal = await this.modalCtrl.create({
      component: SearchCriteriaComponent,
      enterAnimation: enter,
      leaveAnimation: leave,
    });
    return await modal.present();
  }

  ngOnDestroy() {
    this.searchCriteria$.unsubscribe();
    this.swipeStackRefill$.unsubscribe();
  }
}
