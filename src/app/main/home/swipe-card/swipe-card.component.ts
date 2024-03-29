import { Animation, NavController } from "@ionic/angular";
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
  Renderer2,
} from "@angular/core";

import {
  BehaviorSubject,
  combineLatest,
  concat,
  defer,
  firstValueFrom,
  forkJoin,
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
  map,
  mergeMap,
  pairwise,
  startWith,
  switchMap,
  take,
  tap,
  timeInterval,
  timeout,
  withLatestFrom,
} from "rxjs/operators";

import { ProfileCardComponent } from "@components/index";
import { matchMessages } from "@interfaces/profile.model";

import {
  ChatboardStore,
  OtherProfilesStore,
  StackState,
  SwipeOutcomeStore,
  SwipeStackStore,
} from "@stores/index";

import { Chat, Profile } from "@classes/index";
import {
  Gender,
  mdMainFromDatabase,
  SexualPreference,
  swipeChoice,
} from "@interfaces/index";
import {
  SwipeAnimation,
  YesBubbleAnimation,
  NoBubbleAnimation,
  OpenCatchAnimation,
  CloseCatchAnimation,
} from "@animations/index";
import { AngularFirestore } from "@angular/fire/firestore";
import { GlobalErrorHandler } from "@services/errors/global-error-handler.service";
import { SwipeCapService } from "@stores/swipe-stack/swipe-cap.service";
import { AnalyticsService } from "@services/analytics/analytics.service";
import { catchTimeout, FilterFalsy, Logger } from "src/app/shared/functions/custom-rxjs";
import { wait } from "src/app/shared/functions/common";

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

  timeOfLatestCardTap = 0; // (ms) - set to 0 when we want the diff with current time to be larger than threshold
  DOUBLE_TAP_THRESHOLD = 800;
  choiceOfLatestTap: swipeChoice = null;

  latestMatchedProfile: Profile | null;
  chosenCatchMsg: string;

  subs = new Subscription();

  @Input() profiles$: Observable<Profile[]>;
  @Input() homeContainer: ElementRef;
  @Input() swipeCardsRef: ElementRef;
  @Input() searchCriteriaButtonRef: ElementRef;
  @Input() set showLoadingSetter(value: boolean) {
    if (value === true || value === false) this.showLoading$.next(value);
  }

  // All of these are for showing SC or match animation. Assuming that always happens sufficiently late that these refs can't be undefined
  //@ViewChild("homeContainer", { read: ElementRef }) homeContainer: ElementRef;
  // @ViewChild("pic1", { read: ElementRef }) pic1: ElementRef;
  // @ViewChild("pic2", { read: ElementRef }) pic2: ElementRef;
  @ViewChild("catchText", { read: ElementRef }) catchText: ElementRef;
  // @ViewChild("swipeCards", { read: ElementRef }) swipeCards: ElementRef;
  @ViewChild("backdrop", { read: ElementRef }) backdrop: ElementRef;
  @ViewChild("catchEls", { read: ElementRef }) catchEls: ElementRef;

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

  showLoading$ = new BehaviorSubject<boolean>(true);

  managePictureSwiping$ = this.cardStackRef$.pipe(
    take(1),
    map((ref) =>
      this.subs.add(this.swipeStackStore.managePictureSwiping(ref).subscribe())
    )
  );

  // enforces that the cards don't show if the stack is in one of those states
  // this is in particular for the case where profiles have already been fetched
  // and are contained in profilesToRender$, and the user does something (e.g. goes "Under")
  // which changes the stackState to one of those. It is therefore required for that scenario
  // for showProfile and is more of a safety net for cap-reached and empty.
  hideCardStates: StackState[] = ["cap-reached", "not-showing-profile", "empty"];
  hideCards$ = this.swipeStackStore.stackState$.pipe(
    map((ss) => this.hideCardStates.includes(ss))
  );

  showEmptyPrompt$ = combineLatest([
    this.showLoading$,
    this.swipeStackStore.stackState$,
  ]).pipe(
    map(([showLoading, stackState]) => stackState === "empty" && showLoading === false)
  );
  showCapReachedPrompt$ = combineLatest([
    this.showLoading$,
    this.swipeStackStore.stackState$,
  ]).pipe(
    map(
      ([showLoading, stackState]) => stackState === "cap-reached" && showLoading === false
    )
  );
  showNotShowingProfilePrompt$ = combineLatest([
    this.showLoading$,
    this.swipeStackStore.stackState$,
  ]).pipe(
    map(
      ([showLoading, stackState]) =>
        stackState === "not-showing-profile" && showLoading === false
    )
  );

  constructor(
    private renderer: Renderer2,
    private firestore: AngularFirestore,
    private fbAnalytics: AnalyticsService,
    private navCtrl: NavController,

    private chatboardStore: ChatboardStore,
    private swipeOutcomeStore: SwipeOutcomeStore,
    private swipeStackStore: SwipeStackStore,
    private otherProfilesStore: OtherProfilesStore,

    private errorHandler: GlobalErrorHandler,
    private swipeCap: SwipeCapService
  ) {
    this.onResize();
  }

  async ngOnInit() {
    // this.userFromStore$.pipe(
    //   tap((user) => {
    //     this.userGoneUnder.next(user.settings.showProfile);
    //   }
    // ));
  }

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

    // this.profiles$
    //   .pipe(
    //     filter((p) => p.length > 0),
    //     map((p) => p[0].uid),
    //     switchMap((uid) =>
    //       this.getSexPrefAndGender(uid).pipe(
    //         map(([sexPref, gender]) =>
    //           this.DEV_other_profile_info.next({ uid, sexPref, gender })
    //         )
    //       )
    //     )
    //   )
    //   .subscribe();
  }

  getSexPrefAndGender(uid: string): Observable<[SexualPreference, Gender]> {
    return this.firestore
      .collection("matchData")
      .doc<mdMainFromDatabase>(uid)
      .get()
      .pipe(
        take(1),
        map((doc) => {
          const data = doc.data();
          return [data?.sexualPreference, data?.gender];
        })
      );
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
  private doubleTapOnCard(ownChoice: swipeChoice): Observable<any> {
    return this.profiles$.pipe(
      take(1),
      exhaustMap((profiles) =>
        combineLatest([
          of(profiles[0]),
          this.swipeOutcomeStore.getChoiceOf(profiles[0].uid),
        ])
      ),
      exhaustMap(([profile, otherChoice]) => {
        if (ownChoice === "no") return this.onNoSwipe(profile);

        if (["yes", "super"].includes(ownChoice) && otherChoice === "no")
          return this.onYesSwipe(profile);

        if (
          ["yes", "super"].includes(ownChoice) &&
          ["yes", "super"].includes(otherChoice)
        )
          return this.onMatch(profile);

        return of("");
      })
    );
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
      console.error("No super swipe logic for single tap");
    }
  }

  /**
   * - Removes profile from the swipe stack,
   * - registers swipe choice in swipeOutcomeStore,
   * - Checks whether other user likes as well, triggers onMatch method if match
   */
  onYesSwipe(profile: Profile): Observable<any> {
    const storeTasks$ = (p: Profile) =>
      forkJoin([
        this.swipeStackStore.removeProfile(p),
        this.swipeOutcomeStore.yesSwipe(p),
        this.logSwipeAction("yes_swipe", profile),
      ]);
    const changeText = () => {
      this.likeText.nativeElement.innerHTML = `You liked ${profile.firstName}!`;
    };

    const animateSwipe = SwipeAnimation(
      storeTasks$.bind(this),
      profile,
      this.likeEls,
      this.searchCriteriaButtonRef
    );

    return concat(
      of(changeText()),
      defer(() => animateSwipe())
    );
  }

  logSwipeAction(event: "yes_swipe" | "no_swipe" | "match", otherProfile: Profile) {
    return this.errorHandler.getCurrentUser$().pipe(
      FilterFalsy(),
      take(1),
      switchMap((user) =>
        this.fbAnalytics.logEvent(event, {
          swiperUID: user.uid, //UID of person swiping
          otherUID: otherProfile.uid,
          timestamp: Date.now(), //Time since epoch
        })
      )
    );
  }

  /**
   * - Removes profile from the swipe stack,
   * - registers swipe choice in swipeOutcomeStore
   * */
  onNoSwipe(profile: Profile): Observable<any> {
    const storeTasks$ = (p: Profile) =>
      forkJoin([
        this.swipeStackStore.removeProfile(p),
        this.swipeOutcomeStore.noSwipe(p),
        this.logSwipeAction("no_swipe", profile),
      ]);
    const changeText = () => {
      this.dislikeText.nativeElement.innerHTML = `You passed on ${profile.firstName}.`;
    };

    const animateSwipe = SwipeAnimation(
      storeTasks$.bind(this),
      profile,
      this.dislikeEls,
      this.searchCriteriaButtonRef
    );

    return concat(
      of(changeText()),
      defer(() => animateSwipe())
    );
  }

  /**
   * - Shows the match animation / modal,
   * - triggers "registerSwipeChoices" from swipeOutcomeStore, which removes swipeOutcome list and
   * saves them on the database, new doc is created backend
   */
  private onMatch(matchedProfile: Profile) {
    const postAnimTasks$ = (p) =>
      concat(
        this.swipeStackStore.removeProfile(p),
        this.otherProfilesStore.saveProfile(p),
        this.logSwipeAction("match", matchedProfile)
      );

    // done independently since the animation doesn't need ot occur for it to be presented
    firstValueFrom(this.swipeOutcomeStore.yesSwipe(matchedProfile)).then(() =>
      this.swipeOutcomeStore.registerSwipeChoices()
    );

    return concat(
      defer(() => this.playCatch(matchedProfile)),
      postAnimTasks$(matchedProfile)
    );
  }

  changeCatchMessage() {
    this.chosenCatchMsg = matchMessages[Math.floor(Math.random() * matchMessages.length)];
  }

  async CatchAnimation(
    midAnimTasks$: (p: Profile) => Observable<any>,
    matchedProfile: Profile
  ) {
    // this is wrong, the midAnimTasks should go at the appropriate place within playCatch
    // then closeCatch should only be played once an action is taken (like continue swiping or go to catch)
    await this.playCatch(matchedProfile);

    await firstValueFrom(midAnimTasks$(matchedProfile));

    // return this.closeCatch
  }

  async playCatch(matchedProfile: Profile) {
    const catchItems = document.getElementById("catchEls");
    const closeButton = document.getElementById("closeAnimation");
    const messageText = document.getElementById("messageText");

    this.latestMatchedProfile = matchedProfile;
    this.changeCatchMessage();

    // match's picture styling for backdrop
    this.renderer.setStyle(
      this.backdrop.nativeElement,
      "background",
      `url(${matchedProfile.pictureUrls[0]})`
    );
    this.renderer.setStyle(this.backdrop.nativeElement, "backgroundSize", "cover");
    this.renderer.setStyle(this.backdrop.nativeElement, "backgroundPosition", "center");

    // other stylings
    this.renderer.setStyle(catchItems, "display", "block");
    this.renderer.setStyle(closeButton, "display", "flex");
    this.renderer.setStyle(messageText, "display", "flex");

    // catch animation
    return OpenCatchAnimation(
      this.screenHeight,
      this.screenWidth,
      this.catchText,
      this.backdrop,
      this.swipeCardsRef,
      this.searchCriteriaButtonRef
    ).play();
  }

  async closeCatch() {
    const catchItems = document.getElementById("catchEls");

    await CloseCatchAnimation(
      this.screenHeight,
      this.screenWidth,
      this.catchText,
      this.backdrop,
      this.swipeCardsRef,
      this.searchCriteriaButtonRef
    ).play();

    this.renderer.setStyle(catchItems, "display", "none");
  }

  async goToNewCatchChat() {
    const maxTimeWaitingForChat = 6000; // 6 seconds

    const user = await this.errorHandler.getCurrentUser();
    if (!user) return;

    // const loader = await this.loadingAlertManager.createLoading({});
    // await this.loadingAlertManager.presentNew(loader, "replace-erase");

    return firstValueFrom(
      this.chatboardStore.userHasChatWith(this.latestMatchedProfile.uid, false).pipe(
        filter((chat) => chat !== false),
        take(1),
        timeout(maxTimeWaitingForChat),
        switchMap((chat: Chat) =>
          defer(() =>
            this.navCtrl
              .navigateForward(["main/messenger/" + chat.id])
              .then(() => wait(300))
              .then(() => this.closeCatch())
          )
        ),
        catchTimeout(of(""))
      )
    );
  }

  // this is for trackBy of ngFor on profiles in template
  trackProfile(index: number, profile: Profile) {
    return profile.uid;
  }

  async openedProfileAnalytics(profileUID: string) {
    this.fbAnalytics.logEvent("profile_expanded", {
      profileOpened: profileUID, //UID of profile expanded
      timestamp: Date.now(), //Time since epoch
    });
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }
}
