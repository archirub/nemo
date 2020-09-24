import { Component, OnInit, Input, OnDestroy } from "@angular/core";
import { AngularFirestore } from "@angular/fire/firestore";

import { Subscription } from "rxjs";

import { DatabaseService } from "@services/database/database.service";
import {
  SwipeOutcomeStoreService,
  SwipeStackStoreService,
} from "@stores/index";
import { profileSnapshot } from "@interfaces/profile";

@Component({
  selector: "app-swipe-card",
  templateUrl: "./swipe-card.component.html",
  styleUrls: ["./swipe-card.component.scss"],
})
export class SwipeCardComponent implements OnInit, OnDestroy {
  swipeProfiles$: Subscription;
  swipeProfiles: profileSnapshot[];

  latestOutcome$: Subscription;
  dislikedProfiles$: Subscription;
  likedProfiles$: Subscription;

  constructor(
    private swipeOutcomeStore: SwipeOutcomeStoreService,
    private swipeStackStore: SwipeStackStoreService,
    private firestore: AngularFirestore,
    private db: DatabaseService
  ) {}

  ngOnInit() {
    this.swipeProfiles$ = this.swipeStackStore.profiles.subscribe({
      next: async (profiles) => {
        this.swipeProfiles = profiles;
      },
    });

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

  async onYesSwipe(profile: profileSnapshot) {
    if (profile) {
      this.swipeStackStore.removeProfile(profile);
      // check in database if other user liked too, if yes, match them
      const YesIsMutual: Boolean = await this.db.isLikedBy(profile.id); // temporary
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

  onNoSwipe(profile: profileSnapshot) {
    if (profile) {
      this.swipeStackStore.removeProfile(profile);
      this.swipeOutcomeStore.noSwipe(profile);
    }
  }

  ngOnDestroy() {
    this.swipeProfiles$.unsubscribe();
    this.latestOutcome$.unsubscribe();
    this.likedProfiles$.unsubscribe();
    this.dislikedProfiles$.unsubscribe();
  }
}
