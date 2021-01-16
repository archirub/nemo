import { Component, OnInit, OnDestroy, Input } from "@angular/core";

import { Subscription } from "rxjs";

import { DatabaseService } from "@services/database/database.service";
import { SwipeOutcomeStore, SwipeStackStore } from "@stores/index";
import { Profile } from "@classes/index";

@Component({
  selector: "app-swipe-card",
  templateUrl: "./swipe-card.component.html",
  styleUrls: ["./swipe-card.component.scss"],
})
export class SwipeCardComponent implements OnInit, OnDestroy {
  @Input() profiles: Profile[];

  latestOutcome$: Subscription;
  dislikedProfiles$: Subscription;
  likedProfiles$: Subscription;

  constructor(
    private swipeOutcomeStore: SwipeOutcomeStore,
    private swipeStackStore: SwipeStackStore,
    private db: DatabaseService
  ) {}

  ngOnInit() {
    this.latestOutcome$ = this.swipeOutcomeStore.latestOutcome.subscribe({
      next: (outcome) => console.log("outcome:", outcome),
    });

    this.dislikedProfiles$ = this.swipeOutcomeStore.noProfiles.subscribe({
      next: (profiles) => console.log("disliked Profiles:", profiles),
    });

    this.likedProfiles$ = this.swipeOutcomeStore.yesProfiles.subscribe({
      next: (profiles) => console.log("liked Profiles:", profiles),
    });
  }

  async onYesSwipe(profile: Profile) {
    if (profile) {
      this.swipeStackStore.removeProfile(profile);
      // check in database if other user liked too, if yes, match them
      const YesIsMutual: Boolean = await this.db.isLikedBy(profile.uid); // temporary
      if (YesIsMutual) {
        console.log("MATCH");

        //(create function called
        // smtgh like onMatch(profile), that handles everything that is implied when 2 people match
        // i.e. match animation, add to matches array of both users on db, add to "matches never chatted
        // with" in chat page or wtv))
      } else {
        this.swipeOutcomeStore.yesSwipe(profile);
      }
    }
  }

  onNoSwipe(profile: Profile) {
    if (profile) {
      this.swipeStackStore.removeProfile(profile);
      this.swipeOutcomeStore.noSwipe(profile);
    }
  }

  ngOnDestroy() {
    this.latestOutcome$.unsubscribe();
    this.likedProfiles$.unsubscribe();
    this.dislikedProfiles$.unsubscribe();
  }
}
