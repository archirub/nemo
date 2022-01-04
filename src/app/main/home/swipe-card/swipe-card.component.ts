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
  EMPTY,
  forkJoin,
  from,
  merge,
  Observable,
  of,
  ReplaySubject,
  Subject,
  Subscription,
} from "rxjs";
import {
  exhaustMap,
  filter,
  first,
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

import {
  CurrentUserStore,
  OtherProfilesStore,
  SearchCriteriaStore,
  SwipeOutcomeStore,
  SwipeStackStore,
} from "@stores/index";

import { Profile, AppUser, SearchCriteria } from "@classes/index";
import { mdDatingPickingFromDatabase, swipeChoice, piStorage } from "@interfaces/index";
import { SwipeAnimation, YesBubbleAnimation, NoBubbleAnimation } from "@animations/index";
import {
  AngularFirestore,
  DocumentSnapshot,
  QuerySnapshot,
} from "@angular/fire/firestore";
import { GlobalErrorHandler } from "@services/errors/global-error-handler.service";
import { SwipeCapService } from "@stores/swipe-stack/swipe-cap.service";

@Component({
  selector: "app-swipe-card",
  templateUrl: "./swipe-card.component.html",
  styleUrls: ["./swipe-card.component.scss"],
})
export class SwipeCardComponent implements OnInit, OnDestroy {
  // DEV
  // DEV_other_profile_info = new BehaviorSubject<Object>(null);
  // DEV_own_profile_info = new BehaviorSubject<Object>(null);

  screenHeight: number;
  screenWidth: number;
  yesBubbleAnimation: Animation;
  noBubbleAnimation: Animation;
  currentUser: AppUser;

  timeOfLatestCardTap = 0; // (ms) - set to 0 when we want the diff with current time to be larger than threshold
  DOUBLE_TAP_THRESHOLD = 800;
  choiceOfLatestTap: swipeChoice = null;

  subs = new Subscription();

  @Input() profiles$: Observable<Profile[]>;
  @Output() matched = new EventEmitter<Profile>();

  @ViewChildren("cards", { read: ElementRef }) cards: QueryList<ElementRef>;
  @ViewChild("yesBubble", { read: ElementRef }) yesBubble: ElementRef;
  @ViewChild("noBubble", { read: ElementRef }) noBubble: ElementRef;
  @ViewChild("likeEls", { read: ElementRef }) likeEls: ElementRef;
  @ViewChild("dislikeEls", { read: ElementRef }) dislikeEls: ElementRef;
  @ViewChild("likeText", { read: ElementRef }) likeText: ElementRef;
  @ViewChild("dislikeText", { read: ElementRef }) dislikeText: ElementRef;
  @ViewChild("profileComponent") profileComponent: ProfileCardComponent;

  private cardStackRef$ = new ReplaySubject<QueryList<ProfileCardComponent>>(1);
  @ViewChildren("profileComponent") set cardStackRefSetter(
    ref: QueryList<ProfileCardComponent>
  ) {
    if (ref) this.cardStackRef$.next(ref);
  }

  @HostListener("window:resize", ["$event"])
  onResize() {
    this.screenWidth = window.innerWidth;
    this.screenHeight = window.innerHeight;
  }

  cardTap$ = new Subject<swipeChoice>();

  singleTap$ = new Subject<swipeChoice>();

  doubleTap$ = new Subject<swipeChoice>();

  tapInProgress$ = new BehaviorSubject<boolean>(false);

  managePictureSwiping$ = this.cardStackRef$.pipe(
    first(),
    map((ref) =>
      this.subs.add(this.swipeStackStore.managePictureSwiping(ref).subscribe())
    )
  );

  constructor(
    private firestore: AngularFirestore,

    private swipeOutcomeStore: SwipeOutcomeStore,
    private swipeStackStore: SwipeStackStore,
    private otherProfilesStore: OtherProfilesStore,
    private SCstore: SearchCriteriaStore, // for DEV
    private currentUserStore: CurrentUserStore, // for DEV

    private errorHandler: GlobalErrorHandler,
    private swipeCap: SwipeCapService
  ) {
    this.onResize();
  }

  ngOnInit() {}

  ngAfterViewInit() {
    this.subs.add(this.managePictureSwiping$.subscribe());
    this.subs.add(this.onCardTapLogic().subscribe());
    this.subs.add(this.handleTaps().subscribe());

    // DEV
    // this.currentUserStore.user$
    //   .pipe(
    //     filter((user) => !!user),
    //     switchMap((user) => this.getPiStorageAndPickingData(user)),
    //     map(([pickingData, piStorage, profile]) => {
    //       const searchFeatures = pickingData.data().searchFeatures;
    //       const piStorageData = piStorage.docs[0].data()[profile.uid];

    //       this.DEV_own_profile_info.next({
    //         own_percentile: piStorageData.percentile,
    //       });
    //     })
    //   )
    //   .subscribe();

    // DEV
    // this.profiles$
    //   .pipe(
    //     filter((p) => p.length > 0),
    //     map((p) => p[0]),
    //     switchMap((profile) => this.getPiStorageAndPickingData(profile)),
    //     withLatestFrom(this.SCstore.searchCriteria$),
    //     map(
    //       ([[pickingData, piStorage, profile], SC]: [
    //         [
    //           DocumentSnapshot<mdDatingPickingFromDatabase>,
    //           QuerySnapshot<piStorage>,
    //           Profile
    //         ],
    //         SearchCriteria
    //       ]) => {
    //         const searchFeatures = pickingData.data().searchFeatures;
    //         const piStorageData = piStorage.docs[0].data()[profile.uid];

    //         let SC_degreeOfMatch: number;

    //         if (SC instanceof SearchCriteria) {
    //           SC_degreeOfMatch = 0;
    //           Object.keys(SC).forEach((key: keyof SearchCriteria) => {
    //             const criteria = SC[key];
    //             const feature = searchFeatures[key];

    //             if (!criteria || !feature) return;

    //             if (key !== "interests") {
    //               if (criteria === feature) SC_degreeOfMatch++;
    //             } else {
    //               for (const f of feature) {
    //                 if (criteria === f) {
    //                   SC_degreeOfMatch++;
    //                   break;
    //                 }
    //               }
    //             }
    //           });

    //           SC_degreeOfMatch /= Object.keys(SC).length;
    //         }

    //         this.DEV_other_profile_info.next({
    //           percentile: piStorageData.percentile,
    //           SC_degreeOfMatch,
    //         });
    //       }
    //     )
    //   )
    //   .subscribe();
  }

  // DEV
  // getPiStorageAndPickingData(profile: Profile) {
  //   const pickingData$ = this.firestore
  //     .collection("matchData")
  //     .doc(profile.uid)
  //     .collection("pickingData")
  //     .doc("dating")
  //     .get()
  //     .pipe(
  //       take(1),
  //       this.errorHandler.convertErrors("firestore"),
  //       this.errorHandler.handleErrors()
  //     );
  //   const piStorage$ = from(
  //     this.firestore.firestore
  //       .collection("piStorage")
  //       .where("uids", "array-contains", profile.uid)
  //       .limit(1)
  //       .get()
  //   ).pipe(
  //     this.errorHandler.convertErrors("firestore"),
  //     this.errorHandler.handleErrors()
  //   );

  //   return forkJoin([pickingData$, piStorage$, of(profile)]) as Observable<
  //     [DocumentSnapshot<mdDatingPickingFromDatabase>, QuerySnapshot<piStorage>, Profile]
  //   >;
  // }

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
        return concat(this.swipeCap.useSwipe(), this.doubleTapOnCard(choice)).pipe(
          tap(() => this.tapInProgress$.next(false))
        );
      })
    );
  }

  // This contains what should be done when the card is double tapped. That is check whether
  // the tap the double tap was a yes or a no or a super, and subsequently animate it and
  // do logic associated with it
  private doubleTapOnCard(choice: swipeChoice): Observable<any> {
    if (choice === "yes") {
      //return this.cardStackRef$.pipe(
      //switchMap(() =>
      return this.profiles$.pipe(
        take(1),
        // withLatestFrom(of(SwipeAnimation(this.likeEls))),
        switchMap((profiles) =>
          concat(
            // this.onYesSwipe(profiles[0]),
            // swipeAnimation.play(),
            SwipeAnimation(this.onYesSwipe.bind(this), profiles[0], this.likeEls)(),
            (this.likeText.nativeElement.innerHTML = `You liked ${profiles[0].firstName}!`)
          )
        )
      );
      //)
      //);
    }
    if (choice === "no") {
      return this.profiles$.pipe(
        take(1),
        // withLatestFrom(of(SwipeAnimation(this.dislikeEls))),
        switchMap((profiles) =>
          concat(
            // this.onNoSwipe(profiles[0]),
            // swipeAnimation.play(),
            SwipeAnimation(this.onNoSwipe.bind(this), profiles[0], this.likeEls)(),
            (this.dislikeText.nativeElement.innerHTML = `You passed on ${profiles[0].firstName}.`)
          )
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
        return of("");
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
      this.swipeOutcomeStore.registerSwipeChoices$
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
