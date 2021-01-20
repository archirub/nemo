import { ModalController } from "@ionic/angular";
import { Component, OnInit, OnDestroy, Input } from "@angular/core";

import { Subscription } from "rxjs";

import {
  ChatStore,
  CurrentUserStore,
  SwipeOutcomeStore,
  SwipeStackStore,
} from "@stores/index";
import { Profile, User } from "@classes/index";
import { MatchModalComponent } from "@components/index";
import { swipeChoice } from "@interfaces/index";

@Component({
  selector: "app-swipe-card",
  templateUrl: "./swipe-card.component.html",
  styleUrls: ["./swipe-card.component.scss"],
})
export class SwipeCardComponent implements OnInit, OnDestroy {
  @Input() profiles: Profile[];

  currentUser$: Subscription;
  currentUser: User;

  constructor(
    private swipeOutcomeStore: SwipeOutcomeStore,
    private swipeStackStore: SwipeStackStore,
    private modalCtrl: ModalController,
    private chatStore: ChatStore,
    private currentUserStore: CurrentUserStore
  ) {}

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

  ngOnDestroy() {
    this.currentUser$.unsubscribe();
  }
}
