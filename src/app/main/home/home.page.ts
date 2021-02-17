import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  HostListener,
  Output,
} from "@angular/core";
import { ModalController } from "@ionic/angular";

import { Observable, Subscription } from "rxjs";
import { throttle, filter } from "rxjs/operators";

import { SearchCriteriaComponent } from "./search-criteria/search-criteria.component";

import { Profile, SearchCriteria } from "@classes/index";
import { SearchCriteriaStore, SwipeOutcomeStore, SwipeStackStore } from "@stores/index";
import { SCenterAnimation, SCleaveAnimation } from "@animations/index";
import { FormatService } from "@services/index";
import { TabElementRefService } from "src/app/main/tab-menu/tab-element-ref.service";
import { EventEmitter } from "events";
import { SwipeCardComponent } from "./swipe-card/swipe-card.component";

@Component({
  selector: "app-home",
  templateUrl: "home.page.html",
  styleUrls: ["home.page.scss"],
})
export class HomePage implements OnInit, OnDestroy {
  @Output() refillEmitter = new EventEmitter();

  swipeProfiles: Observable<Profile[]>;
  private swipeStackRefill$: Subscription;

  private searchCriteria: SearchCriteria = new SearchCriteria(
    null,
    null,
    null,
    null,
    null,
    null
  );
  private searchCriteria$: Subscription;

  // PROPERTIES FOR MODAL ANIMATION
  @ViewChild("homeContainer", { read: ElementRef }) homeContainer: ElementRef;
  @ViewChild("searchButton", { read: ElementRef }) searchButton: ElementRef;
  screenHeight: number;
  screenWidth: number;
  @HostListener("window:resize", ["$event"])
  onResize() {
    this.screenHeight = window.innerHeight;
    this.screenWidth = window.innerWidth;
  }

  constructor(
    private swipeStackStore: SwipeStackStore,
    private SCstore: SearchCriteriaStore,
    private modalCtrl: ModalController,
    private tabElementRef: TabElementRefService,
    private swipeOutcomeStore: SwipeOutcomeStore,
    private format: FormatService
  ) {
    this.onResize();
  }

  modal: HTMLIonModalElement;
  SCenterAnimation;
  SCleaveAnimation;

  async ngOnInit() {
    this.swipeProfiles = this.swipeStackStore.profiles;
    this.searchCriteria$ = this.SCstore.searchCriteria.subscribe((SC) => {
      this.searchCriteria = SC;
    });

    // Makes sure swipe stack is only filled when its length is smaller or equal to a given
    // length, and that no new query to refill the swipe stack is made while a query
    // is already being processed.
    this.swipeStackRefill$ = this.swipeProfiles
      .pipe(
        filter((profiles) => profiles && profiles.length !== 0 && profiles.length <= 4),
        throttle(async () => {
          console.log("Refilling swipe stack");
          await this.swipeOutcomeStore.registerSwipeChoices(),
            await this.swipeStackStore.addToSwipeStackQueue(this.searchCriteria);
          console.log("Emitting refill event");
          this.refillEmitter.emit("refill");
        })
      )
      .subscribe();
  }

  ionViewDidEnter() {
    this.SCenterAnimation = SCenterAnimation(
      this.searchButton,
      this.tabElementRef.tabRef,
      this.homeContainer,
      this.screenWidth,
      this.screenHeight
    );
    this.SCleaveAnimation = SCleaveAnimation(
      this.searchButton,
      this.tabElementRef.tabRef,
      this.homeContainer,
      this.screenWidth,
      this.screenHeight
    );

    this.modalCtrl
      .create({
        component: SearchCriteriaComponent,
        enterAnimation: this.SCenterAnimation,
        leaveAnimation: this.SCleaveAnimation,
      })
      .then((m) => {
        this.modal = m;
        this.onModalDismiss(this.modal);
      });
  }

  async presentSCmodal(): Promise<void> {
    return await this.modal.present();
  }

  // Used to preload modal as soon as the previous SC window was dismissed
  onModalDismiss(modal: HTMLIonModalElement) {
    if (!modal) return;
    modal.onDidDismiss().then(() => {
      this.modalCtrl
        .create({
          component: SearchCriteriaComponent,
          enterAnimation: this.SCenterAnimation,
          leaveAnimation: this.SCleaveAnimation,
        })
        .then((m) => {
          this.modal = m;
          return this.modal;
        })
        .then((m) => this.onModalDismiss(m));
    });
  }

  @ViewChild(SwipeCardComponent) child: SwipeCardComponent;
  ngAfterViewInit() {
    this.refillEmitter.on("refill", this.child.refillRotate);
  }

  ngOnDestroy() {
    this.searchCriteria$.unsubscribe();
    this.swipeStackRefill$.unsubscribe();
  }
}