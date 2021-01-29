import { ModalController } from "@ionic/angular";
import { Component, OnInit, OnDestroy, Input, Output, ViewChild } from "@angular/core";

import { Subscription } from "rxjs";

import {
  ChatStore,
  CurrentUserStore,
  SwipeOutcomeStore,
  SwipeStackStore,
} from "@stores/index";
import { Profile, User } from "@classes/index";
import { MatchModalComponent, ProfileCardComponent } from "@components/index";
import { swipeChoice } from "@interfaces/index";
import { EventEmitter } from "events";

@Component({
  selector: "app-swipe-card",
  templateUrl: "./swipe-card.component.html",
  styleUrls: ["./swipe-card.component.scss"],
})
export class SwipeCardComponent extends EventEmitter implements OnInit, OnDestroy {
  @Input() profiles: Profile[];
  @Output() refillEmitter = new EventEmitter();

  currentUser$: Subscription;
  currentUser: User;

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

  /* Math rotation function for swipe card stack */
  refillRotate() {
    var cards:any = document.getElementsByClassName('swipe-cards');
    for (let i = 0; i < cards.length; i++) {
        let element = cards[i];
        element.style.transform = `rotate(${(Math.random() * 10) - 5}deg)`;
    };
  }

  ngOnDestroy() {
    this.currentUser$.unsubscribe();
  }
}
