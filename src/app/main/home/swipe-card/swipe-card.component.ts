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

import {
  ChatStore,
  CurrentUserStore,
  SwipeOutcomeStore,
  SwipeStackStore,
} from "@stores/index";
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

  timeOfLatestCardTap = 0; // in millisecond; starts this way to guarantee
  DOUBLE_TAP_THRESHOLD = 500;
  choiceOfLatestTap: swipeChoice = null;
  cardTapSub: Subscription;

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
        // behavior in case user taps different sides
        if (this.choiceOfLatestTap !== choice) {
          this.choiceOfLatestTap = choice;

          return this.singleTapOnCard(choice);
        }

        const now = Date.now();

        if (Math.abs(now - this.timeOfLatestCardTap) <= this.DOUBLE_TAP_THRESHOLD) {
          this.timeOfLatestCardTap = 0;
          this.choiceOfLatestTap = choice;

          return this.doubleTapOnCard(choice);
        }

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

  // /** Displays the modal that shows the match animation */
  // private async presentMatchModal() {
  //   const matchModal = await this.modalCtrl.create({
  //     component: MatchModalComponent,
  //   });

  //   await matchModal.present();
  // }

  doubleTapOnCard(choice: swipeChoice): Observable<void> {
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

  singleTapOnCard(choice: swipeChoice): Observable<void> {
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

  // async doubleTap(choice) {
  //   console.log("choice", choice);
  //   this.swipeYesAnimation = SwipeYesAnimation(this.card.toArray()[0], this.screenWidth);
  //   this.swipeNoAnimation = SwipeNoAnimation(this.card.toArray()[0], this.screenWidth);

  //   this.screenTaps += 1;

  //   setTimeout(() => {
  //     this.screenTaps = 0;
  //   }, 500);

  //   if (this.screenTaps > 1) {
  //     //Double tap event
  //     this.screenTaps = 0;

  //     if (choice === "yes") {
  //       //Yes side of profile

  //       this.swipeYesAnimation.play();
  //       setTimeout(() => {
  //         this.onYesSwipe(this.profiles[0]);

  //         this.matched.emit([
  //           this.profiles[0].firstName,
  //           this.profiles[0].pictureUrls[0],
  //         ]); //BASIC MATCH TRIGGER TO BE WIRED PROPERLY
  //       }, 400);
  //     } else if (choice === "no") {
  //       //No side of profile
  //       this.swipeNoAnimation.play();
  //       setTimeout(() => {
  //         this.onNoSwipe(this.profiles[0]);
  //       }, 400);
  //     }
  //   } else if (this.screenTaps == 1) {
  //     if (choice === "yes") {
  //       this.yesBubbleAnimation = YesBubbleAnimation(
  //         this.yesBubble,
  //         this.profileComponent.X,
  //         this.profileComponent.Y
  //       );
  //       this.yesBubbleAnimation.play();
  //     } else if (choice === "no") {
  //       this.noBubbleAnimation = NoBubbleAnimation(
  //         this.noBubble,
  //         this.profileComponent.X,
  //         this.profileComponent.Y
  //       );
  //       this.noBubbleAnimation.play();
  //     }
  //   }
  // }

  ngOnDestroy() {
    this.currentUserSub.unsubscribe();
  }
}
