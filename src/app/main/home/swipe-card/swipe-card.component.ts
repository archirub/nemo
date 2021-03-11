import { ModalController, Animation } from "@ionic/angular";
import { Component, 
  OnInit,
  OnDestroy, 
  Input, 
  QueryList, 
  HostListener, 
  ViewChildren, 
  ElementRef } from "@angular/core";

import { Subscription } from "rxjs";

import {
  ChatStore,
  CurrentUserStore,
  SwipeOutcomeStore,
  SwipeStackStore,
} from "@stores/index";
import { Profile, User } from "@classes/index";
import { MatchModalComponent, ProfileCardComponent } from "@components/index";
import { SwipeYesAnimation, SwipeNoAnimation } from "@animations/index";
import { swipeChoice } from "@interfaces/index";
import { EventEmitter } from "events";

@Component({
  selector: "app-swipe-card",
  templateUrl: "./swipe-card.component.html",
  styleUrls: ["./swipe-card.component.scss"],
})
export class SwipeCardComponent extends EventEmitter implements OnInit, OnDestroy {
  @Input() profiles: Profile[];
  @ViewChildren('card', { read: ElementRef}) card: QueryList<ElementRef>;

  screenWidth: number;
  swipeYesAnimation: Animation;
  swipeNoAnimation: Animation;

  @HostListener("window:resize", ["$event"])
  onResize() {
    this.screenWidth = window.innerWidth;
  }

  currentUser$: Subscription;
  currentUser: User;
  screenTaps: number;

  constructor(
    private swipeOutcomeStore: SwipeOutcomeStore,
    private swipeStackStore: SwipeStackStore,
    private modalCtrl: ModalController,
    private chatStore: ChatStore,
    private currentUserStore: CurrentUserStore
  ) {
    super();
  }

  ngOnInit() {
    // Subscription for chat doc creation in case of match
    this.currentUser$ = this.currentUserStore.user.subscribe(
      (profile) => (this.currentUser = profile)
    );
    this.screenTaps = 0;
    this.screenWidth = window.innerWidth;
  }

  /**
   * - Removes profile from the swipe stack,
   * - registers swipe choice in swipeOutcomeStore,
   * - Checks whether other user likes as well, triggers onMatch method if match
   */
  async onYesSwipe(profile: Profile) {
    if (!profile) return;

    this.swipeStackStore.removeProfile(profile);
    this.swipeOutcomeStore.yesSwipe(profile);

    const userChoice: swipeChoice = this.swipeOutcomeStore.getChoiceOf(profile.uid);
    if (userChoice === "yes" || userChoice === "super") {
      await this.onMatch(profile);
    }
  }

  /**
   * - Removes profile from the swipe stack,
   * - registers swipe choice in swipeOutcomeStore
   * */
  onNoSwipe(profile: Profile) {
    if (!profile) return;
    this.swipeStackStore.removeProfile(profile);
    this.swipeOutcomeStore.noSwipe(profile);
  }

  /**
   * - Shows the match animation / modal,
   * - triggers "registerSwipeChoices" from swipeOutcomeStore, which removes swipeOutcome list and
   * saves them on the database
   * - Creates a new chat document
   */
  private async onMatch(profile: Profile) {
    try {
      await Promise.all([
        this.presentMatchModal(),
        this.swipeOutcomeStore.registerSwipeChoices(),
      ]);
    } catch (e) {
      throw new Error(`onMatch operation wasn't successful - ${e.message}`);
    }
  }

  /** Displays the modal that shows the match animation */
  private async presentMatchModal() {
    const matchModal = await this.modalCtrl.create({
      component: MatchModalComponent,
    });
    await matchModal.present();
  }

  async doubleTap(choice) {
    this.swipeYesAnimation = SwipeYesAnimation(
      this.card.toArray()[0],
      this.screenWidth
    );
    this.swipeNoAnimation = SwipeNoAnimation(
      this.card.toArray()[0],
      this.screenWidth
    );

    this.screenTaps += 1;
    setTimeout(() => {
      this.screenTaps = 0;
    }, 500);
    
    if (this.screenTaps > 1) {
      console.log("Double tap detected.");
      this.screenTaps = 0;

      if (choice === "yes") {
        this.swipeYesAnimation.play();
        setTimeout(() => {
          this.onYesSwipe(this.profiles[0]);
        }, 400);
      } else if (choice === "no") {
        this.swipeNoAnimation.play();
        setTimeout(() => {
          this.onNoSwipe(this.profiles[0]);
        }, 400);
      };
    };
  }

  ngOnDestroy() {
    this.currentUser$.unsubscribe();
  }
}
