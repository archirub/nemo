import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  HostListener,
  Renderer2,
  AfterViewInit,
} from "@angular/core";
import { ModalController, Animation, NavController } from "@ionic/angular";
import { AngularFireFunctions } from "@angular/fire/functions";

import {
  BehaviorSubject,
  combineLatest,
  concat,
  firstValueFrom,
  of,
  ReplaySubject,
  Subscription,
} from "rxjs";
import {
  delay,
  distinctUntilChanged,
  filter,
  finalize,
  first,
  map,
  switchMap,
  tap,
  timeout,
} from "rxjs/operators";
import { PushNotifications } from "@capacitor/push-notifications";

import { SearchCriteriaComponent } from "./search-criteria/search-criteria.component";

import { TabElementRefService } from "src/app/main/tab-menu/tab-element-ref.service";
import { StoreReadinessService } from "@services/store-readiness/store-readiness.service";
import { GlobalErrorHandler } from "@services/errors/global-error-handler.service";
import { TutorialsService } from "@services/tutorials/tutorials.service";
import { SwipeCapService } from "@stores/swipe-stack/swipe-cap.service";

import {
  ChatboardStore,
  CurrentUserStore,
  SwipeOutcomeStore,
  SwipeStackStore,
} from "@stores/index";
import { OwnPicturesStore } from "@stores/pictures/own-pictures/own-pictures.service";

import { Profile } from "@classes/index";
import { matchMessages } from "@interfaces/profile.model";
import {
  SCenterAnimation,
  SCleaveAnimation,
  OpenCatchAnimation,
  CloseCatchAnimation,
  FishSwimAnimation,
} from "@animations/index";
import { LoadingAndAlertManager } from "@services/loader-and-alert-manager/loader-and-alert-manager.service";
import { StoreResetter } from "@services/global-state-management/store-resetter.service";

@Component({
  selector: "app-home",
  templateUrl: "home.page.html",
  styleUrls: ["home.page.scss"],
})
export class HomePage implements OnInit, OnDestroy, AfterViewInit {
  // DEV
  sendNotification() {
    return this.afFunctions
      .httpsCallable("testNotification")({})
      .subscribe((a) => console.log("NOTIFICATION", a));
  }

  // DEV
  removeNotifications() {
    console.log("removing notifications");
    return PushNotifications.removeAllDeliveredNotifications();
  }

  screenHeight: number;
  screenWidth: number;

  mainProfilePicture: string;
  latestMatchedProfile: Profile | null;
  chosenCatchMsg: string;

  loadingAnimation: Animation;

  private subs = new Subscription();

  // All of these are for showing SC or match animation. Assuming that always happens sufficiently late that these refs can't be undefined
  @ViewChild("homeContainer", { read: ElementRef }) homeContainer: ElementRef;
  @ViewChild("pic1", { read: ElementRef }) pic1: ElementRef;
  @ViewChild("pic2", { read: ElementRef }) pic2: ElementRef;
  @ViewChild("catchText", { read: ElementRef }) catchText: ElementRef;
  @ViewChild("swipeCards", { read: ElementRef }) swipeCards: ElementRef;
  @ViewChild("backdrop", { read: ElementRef }) backdrop: ElementRef;

  private fishRef$ = new ReplaySubject<ElementRef>(1);
  @ViewChild("fish", { read: ElementRef }) set fishRefSetter(ref: ElementRef) {
    if (ref) this.fishRef$.next(ref);
  }

  @HostListener("window:resize", ["$event"])
  onResize() {
    this.screenHeight = window.innerHeight;
    this.screenWidth = window.innerWidth;
  }

  showLoading$ = new BehaviorSubject<boolean>(true);
  viewIsReady$ = new BehaviorSubject<boolean>(false);

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

  pageIsReady$ = combineLatest([this.viewIsReady$, this.storeReadiness.home$]).pipe(
    map(([a, b]) => a && b),
    distinctUntilChanged()
  );

  swipeProfiles$ = this.pageIsReady$.pipe(
    switchMap((isReady) => (isReady ? this.swipeStackStore.profilesToRender$ : of([])))
  );

  readinessHandler$ = this.pageIsReady$.pipe(
    filter((isReady) => !!isReady),
    first(),
    tap(() => this.showLoading$.next(false)),
    tap(() => this.subs.add(this.stopLoadingAnimation$.subscribe()))
  );

  mainProfilePictureGetter$ = this.ownPicturesService.urls$.pipe(
    map((urls) => {
      this.mainProfilePicture = urls[0];
    })
  );

  playLoadingAnimation$ = this.fishRef$.pipe(
    first(),
    switchMap((ref) => {
      this.loadingAnimation = FishSwimAnimation(ref);
      return this.loadingAnimation.play();
    })
  );

  stopLoadingAnimation$ = this.fishRef$.pipe(
    first(),
    delay(200),
    map(() => this.loadingAnimation?.destroy())
  );

  displayTutorial$ = this.tutorials.displayTutorial("home");

  constructor(
    private renderer: Renderer2,
    private modalCtrl: ModalController,
    private navCtrl: NavController,
    private afFunctions: AngularFireFunctions,

    private swipeStackStore: SwipeStackStore,
    private ownPicturesService: OwnPicturesStore,
    private chatboardStore: ChatboardStore,

    private loadingAlertManager: LoadingAndAlertManager,
    private errorHandler: GlobalErrorHandler,
    private storeReadiness: StoreReadinessService,
    private tutorials: TutorialsService,
    private swipeCap: SwipeCapService
  ) {
    this.onResize();
  }

  ngOnInit() {
    this.subs.add(this.readinessHandler$.subscribe());
    this.subs.add(this.mainProfilePictureGetter$.subscribe());
    this.swipeCap.swipesLeft$.subscribe((s) => console.log("# of swipes left:", s));
  }

  ngAfterViewInit() {
    this.subs.add(this.playLoadingAnimation$.subscribe());

    this.viewIsReady$.next(true);
  }

  //TUTORIAL EXIT
  onExitTutorial() {
    this.tutorials.markAsSeen("home").subscribe();
  }

  // For development, to avoid fetching the stack on each reload / document save
  activateSwipeStack() {
    this.subs.add(this.swipeStackStore.activate$.subscribe());
  }

  async showSearchCriteria(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: SearchCriteriaComponent,
      enterAnimation: SCenterAnimation(),
      leaveAnimation: SCleaveAnimation(),
    });

    return modal.present();
  }

  changeCatchMessage() {
    this.chosenCatchMsg = matchMessages[Math.floor(Math.random() * matchMessages.length)];
  }

  async playCatch(matchedProfile: Profile) {
    const catchItems = document.getElementById("catchEls");
    const closeButton = document.getElementById("closeAnimation");
    const messageText = document.getElementById("messageText");
    const messageText2 = document.getElementById("messageText2");

    this.latestMatchedProfile = matchedProfile;
    this.changeCatchMessage();

    // own picture styling
    this.renderer.setStyle(
      this.pic1.nativeElement,
      "background",
      `url(${this.mainProfilePicture})`
    );
    this.renderer.setStyle(this.pic1.nativeElement, "backgroundSize", "cover");

    // match's picture styling
    this.renderer.setStyle(
      this.pic2.nativeElement,
      "background",
      `url(${matchedProfile.pictureUrls[0]})`
    );
    this.renderer.setStyle(this.pic2.nativeElement, "backgroundSize", "cover");

    // other stylings
    this.renderer.setStyle(catchItems, "display", "block");
    this.renderer.setStyle(closeButton, "display", "block");
    this.renderer.setStyle(messageText, "display", "flex");
    this.renderer.setStyle(messageText2, "display", "flex");

    // catch animation
    return OpenCatchAnimation(
      this.screenHeight,
      this.screenWidth,
      this.pic1,
      this.pic2,
      this.catchText,
      this.backdrop,
      this.swipeCards
    ).play();
  }

  async closeCatch() {
    const catchItems = document.getElementById("catchEls");

    await CloseCatchAnimation(
      this.screenHeight,
      this.screenWidth,
      this.pic1,
      this.pic2,
      this.catchText,
      this.backdrop,
      this.swipeCards
    ).play();

    this.renderer.setStyle(catchItems, "display", "none");
    this.renderer.setStyle(this.pic2.nativeElement, "background", "black");
  }

  async goToNewCatchChat() {
    const maxTimeWaitingForChat = 6000; // 6 seconds

    const user = await this.errorHandler.getCurrentUser();
    if (!user) return;

    const loader = await this.loadingAlertManager.createLoading({});
    await this.loadingAlertManager.presentNew(loader, "replace-erase");

    return firstValueFrom(
      this.chatboardStore.matches$.pipe(
        map((matches) => matches?.[this.latestMatchedProfile.uid]),
        filter((chat) => !!chat),
        first(),
        timeout(maxTimeWaitingForChat),
        switchMap((chat) =>
          concat(
            this.loadingAlertManager.dismissDisplayed(),
            this.navCtrl.navigateForward(["main/messenger/" + chat.id]),
            this.destroyCatch()
          )
        ),
        finalize(() => this.loadingAlertManager.dismissDisplayed())
      )
    );
  }

  async destroyCatch() {
    let catchItems = document.getElementById("catchEls");
    this.renderer.setStyle(catchItems, "display", "none");
    this.renderer.setStyle(this.pic2.nativeElement, "background", "black");
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }
}
