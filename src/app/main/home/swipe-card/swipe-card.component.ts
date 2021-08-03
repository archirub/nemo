import { ModalController, Animation } from "@ionic/angular";
import {
  Component,
  OnInit,
  OnDestroy,
  Input,
  QueryList,
  HostListener,
  ViewChildren,
  ViewChild,
  ElementRef,
  Output,
  EventEmitter,
} from "@angular/core";

import { concat, forkJoin, fromEvent, Observable, of, Subject, Subscription } from "rxjs";

import { CurrentUserStore, SwipeOutcomeStore, SwipeStackStore } from "@stores/index";
import { Profile, User } from "@classes/index";
import { MatchModalComponent, ProfileCardComponent } from "@components/index";
import {
  SwipeYesAnimation,
  SwipeNoAnimation,
  YesBubbleAnimation,
  NoBubbleAnimation,
} from "@animations/index";
import { swipeChoice } from "@interfaces/index";
import { concatMap, exhaustMap, switchMap, tap } from "rxjs/operators";

@Component({
  selector: "app-swipe-card",
  templateUrl: "./swipe-card.component.html",
  styleUrls: ["./swipe-card.component.scss"],
})
export class SwipeCardComponent extends EventEmitter implements OnInit, OnDestroy {
  @Input() profiles: Profile[];
  @Output() matched = new EventEmitter();
  @ViewChildren("cards", { read: ElementRef }) cards: QueryList<ElementRef>;
  @ViewChild("yesBubble", { read: ElementRef }) yesBubble: ElementRef;
  @ViewChild("noBubble", { read: ElementRef }) noBubble: ElementRef;
  @ViewChild("profileComponent") profileComponent: ProfileCardComponent;

  screenWidth: number;
  yesBubbleAnimation: Animation;
  noBubbleAnimation: Animation;

  cardTap$ = new Subject();

  @HostListener("window:resize", ["$event"])
  onResize() {
    this.screenWidth = window.innerWidth;
  }

  currentUserSub: Subscription;
  currentUser: User;

  timeOfLatestCardTap = 0; // in millisecond; set to 0 when we want the diff with current time to be larger than threshold
  DOUBLE_TAP_THRESHOLD = 500;
  choiceOfLatestTap: swipeChoice = null;
  cardTapSub: Subscription;

  constructor(
    private swipeOutcomeStore: SwipeOutcomeStore,
    private swipeStackStore: SwipeStackStore,
    private modalCtrl: ModalController,
    private currentUserStore: CurrentUserStore
  ) {
    super();
  }

  ngOnInit() {
    this.screenWidth = window.innerWidth;

    // Subscription for chat doc creation in case of match
    this.currentUserSub = this.currentUserStore.user$.subscribe((profile) => {
      this.currentUser = profile;
    });
  }

  ngAfterViewInit() {
    this.cardTapSub = this.onCardTapLogic().subscribe();
  }

  /**
   * Subscribe to this method to listen to the user's choice on the swipe cards and activate the
   * subsequent chain of logic
   */
  onCardTapLogic() {
    return this.cardTap$.pipe(
      concatMap((choice: swipeChoice) => {
        // case where user taps different sides
        if (this.choiceOfLatestTap !== choice) {
          this.choiceOfLatestTap = choice;

          return this.singleTapOnCard(choice);
        }

        const now = Date.now();

        // case where we have two taps on same side and close together in time
        if (Math.abs(now - this.timeOfLatestCardTap) <= this.DOUBLE_TAP_THRESHOLD) {
          this.timeOfLatestCardTap = 0;
          this.choiceOfLatestTap = choice;

          return this.doubleTapOnCard(choice);
        }

        // case where we have one tap
        this.timeOfLatestCardTap = now;
        this.choiceOfLatestTap = choice;

        return this.singleTapOnCard(choice);
      })
    );
  }

  /**
   * - Removes profile from the swipe stack,
   * - registers swipe choice in swipeOutcomeStore,
   * - Checks whether other user likes as well, triggers onMatch method if match
   */
  onYesSwipe(profile: Profile): Observable<any> {
    return forkJoin([
      this.swipeStackStore.removeProfile(profile),
      this.swipeOutcomeStore.yesSwipe(profile),
      this.swipeOutcomeStore.getChoiceOf(profile.uid),
    ]).pipe(
      exhaustMap(([dgaf1, dgaf2, choiceOfOtherUser]) => {
        if (choiceOfOtherUser === "yes" || choiceOfOtherUser === "super")
          return this.onMatch(profile);
        return of();
      })
    );
  }

  /**
   * - Removes profile from the swipe stack,
   * - registers swipe choice in swipeOutcomeStore
   * */
  onNoSwipe(profile: Profile): Observable<any> {
    return concat(
      this.swipeStackStore.removeProfile(profile),
      this.swipeOutcomeStore.noSwipe(profile)
    );
  }

  /**
   * - Shows the match animation / modal,
   * - triggers "registerSwipeChoices" from swipeOutcomeStore, which removes swipeOutcome list and
   * saves them on the database, new doc is created backened
   */
  private onMatch(profile: Profile) {
    return concat(
      of(this.matched.emit([profile.firstName, profile.pictureUrls[0]])),
      this.swipeOutcomeStore.registerSwipeChoices()
    );
  }

  private doubleTapOnCard(choice: swipeChoice): Observable<void> {
    if (choice === "yes") {
      return of(SwipeYesAnimation(this.cards.first, this.screenWidth)).pipe(
        switchMap((swipeAnimation) =>
          concat(swipeAnimation.play(), this.onYesSwipe(this.profiles[0]))
        )
      );
    }
    if (choice === "no") {
      return of(SwipeNoAnimation(this.cards.first, this.screenWidth)).pipe(
        switchMap((swipeAnimation) =>
          concat(swipeAnimation.play(), this.onNoSwipe(this.profiles[0]))
        )
      );
    }
    if (choice === "super") {
      console.log("No super swipe logic for double tap");
    }
  }

  private singleTapOnCard(choice: swipeChoice): Observable<void> {
    if (choice === "yes") {
      return of(
        YesBubbleAnimation(
          this.yesBubble,
          this.profileComponent.X,
          this.profileComponent.Y
        )
      ).pipe(switchMap((animation) => animation.play()));
    }
    if (choice === "no") {
      return of(
        NoBubbleAnimation(this.noBubble, this.profileComponent.X, this.profileComponent.Y)
      ).pipe(switchMap((animation) => animation.play()));
    }
    if (choice === "super") {
      console.log("No super swipe logic for single tap");
    }
  }

  ngOnDestroy() {
    this.currentUserSub.unsubscribe();
    this.cardTapSub.unsubscribe();
  }
}
