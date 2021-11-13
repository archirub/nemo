import { Animation } from "@ionic/angular";
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

import {
  BehaviorSubject,
  concat,
  forkJoin,
  merge,
  Observable,
  of,
  Subject,
  Subscription,
} from "rxjs";
import {
  exhaustMap,
  filter,
  map,
  mergeMap,
  pairwise,
  startWith,
  switchMap,
  take,
  tap,
  timeInterval,
  withLatestFrom,
} from "rxjs/operators";

import { ProfileCardComponent } from "@components/index";

import { OtherProfilesStore, SwipeOutcomeStore, SwipeStackStore } from "@stores/index";

import { Profile, AppUser } from "@classes/index";
import { swipeChoice } from "@interfaces/index";
import {
  SwipeYesAnimation,
  SwipeNoAnimation,
  YesBubbleAnimation,
  NoBubbleAnimation,
} from "@animations/index";

@Component({
  selector: "app-swipe-card",
  templateUrl: "./swipe-card.component.html",
  styleUrls: ["./swipe-card.component.scss"],
})
export class SwipeCardComponent implements OnInit, OnDestroy {
  screenHeight: number;
  screenWidth: number;
  yesBubbleAnimation: Animation;
  noBubbleAnimation: Animation;

  timeOfLatestCardTap = 0; // (ms) - set to 0 when we want the diff with current time to be larger than threshold
  DOUBLE_TAP_THRESHOLD = 800;
  choiceOfLatestTap: swipeChoice = null;

  subs = new Subscription();

  @Input() profiles$: Observable<Profile[]>;
  @Output() matched = new EventEmitter<Profile>();
  @ViewChildren("cards", { read: ElementRef }) cards: QueryList<ElementRef>;
  @ViewChild("yesBubble", { read: ElementRef }) yesBubble: ElementRef;
  @ViewChild("noBubble", { read: ElementRef }) noBubble: ElementRef;
  @ViewChild("profileComponent") profileComponent: ProfileCardComponent;
  @ViewChildren("profileComponent") profCardStack: QueryList<ProfileCardComponent>;
  @HostListener("window:resize", ["$event"])
  onResize() {
    this.screenWidth = window.innerWidth;
    this.screenHeight = window.innerHeight;
  }

  cardTap$ = new Subject<swipeChoice>();

  singleTap$ = new Subject<swipeChoice>();

  doubleTap$ = new Subject<swipeChoice>();

  tapInProgress$ = new BehaviorSubject<boolean>(false);

  currentUser: AppUser;

  constructor(
    private swipeOutcomeStore: SwipeOutcomeStore,
    private swipeStackStore: SwipeStackStore,
    private otherProfilesStore: OtherProfilesStore
  ) {
    this.onResize();
  }

  ngOnInit() {}

  ngAfterViewInit() {
    this.subs.add(
      this.swipeStackStore.managePictureSwiping(this.profCardStack).subscribe()
    );
    this.subs.add(this.onCardTapLogic().subscribe());
    this.subs.add(this.handleTaps().subscribe());
  }

  /**
   * Subscribe to this method to listen to the user's choice on the swipe cards and activate the
   * subsequent chain of logic by passing a new value to either singleTap$ or doubleTap$
   */
  onCardTapLogic() {
    return this.cardTap$.pipe(
      withLatestFrom(this.tapInProgress$),
      filter(([_, inProgress]) => !inProgress),
      map((arr) => arr[0]),
      startWith("" as any), // this is necessary due to the presence of pairwise. Using something that's neither no, yes nor super
      timeInterval(),
      pairwise(),
      map((clicks) => {
        if (clicks[0].value !== clicks[1].value) {
          return;
          return this.singleTap$.next(clicks[1].value);
        }

        if (clicks[1].interval <= this.DOUBLE_TAP_THRESHOLD) {
          return this.doubleTap$.next(clicks[1].value);
        }

        return;
        return this.singleTap$.next(clicks[1].value);
      })
    );
  }

  // merger of single tap and double tap handlers
  handleTaps() {
    return merge(this.handleSingleTaps(), this.handleDoubleTaps());
  }

  // handles when a single tap is detected
  handleSingleTaps() {
    return this.singleTap$.pipe(
      mergeMap((choice) => {
        this.tapInProgress$.next(true);
        return this.singleTapOnCard(choice).pipe(
          tap(() => this.tapInProgress$.next(false))
        );
      })
    );
  }

  // handles when a double tap is detected
  handleDoubleTaps() {
    return this.doubleTap$.pipe(
      exhaustMap((choice) => {
        this.tapInProgress$.next(true);
        return this.doubleTapOnCard(choice).pipe(
          tap(() => this.tapInProgress$.next(false))
        );
      })
    );
  }

  // This contains what should be done when the card is double tapped. That is check whether
  // the tap the double tap was a yes or a no or a super, and subsequently animate it and
  // do logic associated with it
  private doubleTapOnCard(choice: swipeChoice): Observable<void> {
    if (choice === "yes") {
      this.matched.emit(Array.from(this.profCardStack)[0].profile); // FOR DEVELOPMENT
      return this.profiles$.pipe(
        take(1),
        withLatestFrom(of(SwipeYesAnimation(this.cards.first, this.screenWidth))),
        switchMap(([profiles, swipeAnimation]) =>
          concat(swipeAnimation.play(), this.onYesSwipe(profiles[0]))
        )
      );
    }
    if (choice === "no") {
      return this.profiles$.pipe(
        take(1),
        withLatestFrom(of(SwipeNoAnimation(this.cards.first, this.screenWidth))),
        switchMap(([profiles, swipeAnimation]) =>
          concat(swipeAnimation.play(), this.onNoSwipe(profiles[0]))
        )
      );
    }
    if (choice === "super") {
      console.log("No super swipe logic for double tap");
    }
  }

  // This contains what should be done when the card is double tapped. That is check whether
  // the tap the double tap was a yes or a no or a super, and subsequently animate it and
  // do logic associated with it
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
      exhaustMap(([_, __, choiceOfOtherUser]) => {
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
      of(this.matched.emit(profile)),
      this.otherProfilesStore.saveProfile(profile.uid, profile),
      this.swipeOutcomeStore.registerSwipeChoices()
    );
  }

  // this is for trackBy of ngFor on profiles in template
  trackProfile(index: number, profile: Profile) {
    return profile.uid;
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }
}
