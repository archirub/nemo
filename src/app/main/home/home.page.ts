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
  take,
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
import { TutorialsStore } from "@stores/tutorials/tutorials.service";
import { SwipeCapService } from "@stores/swipe-stack/swipe-cap.service";
import { AnalyticsService } from "@services/analytics/analytics.service";

import { ChatboardStore, SwipeStackStore } from "@stores/index";
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
import { SubscribeAndLog } from "src/app/shared/functions/custom-rxjs";
import { MessageBoardComponent } from "src/app/main/chats/messenger/message-board/message-board.component";
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

  //DEV
  showTestModal() {}

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
  @ViewChild("swipeCards", { read: ElementRef }) swipeCardsRef: ElementRef;
  @ViewChild("backdrop", { read: ElementRef }) backdrop: ElementRef;
  @ViewChild("searchButton", { read: ElementRef }) searchCriteriaButtonRef: ElementRef;

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
  currentStackState$ = this.swipeStackStore.stackState$;

  pageIsReady$ = combineLatest([this.viewIsReady$, this.storeReadiness.home$]).pipe(
    map(([a, b]) => a && b),
    distinctUntilChanged()
  );

  swipeProfiles$ = this.pageIsReady$.pipe(
    switchMap((isReady) => (isReady ? this.swipeStackStore.profilesToRender$ : of([])))
  );

  readinessHandler$ = this.pageIsReady$.pipe(
    filter((isReady) => !!isReady),
    take(1),
    tap(() => this.showLoading$.next(false)),
    tap(() => this.subs.add(this.stopLoadingAnimation$.subscribe()))
  );

  mainProfilePictureGetter$ = this.ownPicturesService.urls$.pipe(
    map((urls) => {
      this.mainProfilePicture = urls[0];
    })
  );

  playLoadingAnimation$ = this.fishRef$.pipe(
    take(1),
    switchMap((ref) => {
      this.loadingAnimation = FishSwimAnimation(ref);
      return this.loadingAnimation.play();
    })
  );

  stopLoadingAnimation$ = this.fishRef$.pipe(
    take(1),
    delay(200),
    map(() => this.loadingAnimation?.destroy())
  );

  displayTutorial$ = this.tutorials.displayTutorial("home");

  constructor(
    private renderer: Renderer2,
    private modalCtrl: ModalController,
    private navCtrl: NavController,
    private afFunctions: AngularFireFunctions,
    private fbAnalytics: AnalyticsService,

    private swipeStackStore: SwipeStackStore,
    private ownPicturesService: OwnPicturesStore,
    private chatboardStore: ChatboardStore,

    private loadingAlertManager: LoadingAndAlertManager,
    private errorHandler: GlobalErrorHandler,
    private storeReadiness: StoreReadinessService,
    private tutorials: TutorialsStore
  ) {
    this.onResize();
  }

  ngOnInit() {
    this.subs.add(this.readinessHandler$.subscribe());
    this.subs.add(this.mainProfilePictureGetter$.subscribe());
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
    this.fbAnalytics.logEvent("sc_open", {});
    const modal = await this.modalCtrl.create({
      component: SearchCriteriaComponent,
      enterAnimation: SCenterAnimation(),
      leaveAnimation: SCleaveAnimation(),
    });

    return modal.present();
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }
}
