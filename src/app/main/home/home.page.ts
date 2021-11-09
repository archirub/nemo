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
import {
  ModalController,
  Animation,
  LoadingController,
  NavController,
} from "@ionic/angular";

import { AngularFireAuth } from "@angular/fire/auth";
import { BehaviorSubject, combineLatest, concat, of, Subscription } from "rxjs";
import {
  catchError,
  distinctUntilChanged,
  filter,
  first,
  map,
  switchMap,
  take,
  tap,
  timeout,
} from "rxjs/operators";

import { SearchCriteriaComponent } from "./search-criteria/search-criteria.component";

import { LoadingService } from "@services/loading/loading.service";
import { TabElementRefService } from "src/app/main/tab-menu/tab-element-ref.service";
import { StoreReadinessService } from "@services/store-readiness/store-readiness.service";

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

@Component({
  selector: "app-home",
  templateUrl: "home.page.html",
  styleUrls: ["home.page.scss"],
})
export class HomePage implements OnInit, OnDestroy, AfterViewInit {
  screenHeight: number;
  screenWidth: number;

  mainProfilePicture: string;
  latestMatchedProfile: Profile | null;
  chosenCatchMsg: string;

  loadingAnimation: Animation;

  private subs = new Subscription();

  showLoading$ = new BehaviorSubject<boolean>(true);
  viewIsReady$ = new BehaviorSubject<boolean>(false);

  showEmptyPrompt$ = combineLatest([
    this.showLoading$,
    this.swipeStackStore.stackState$,
  ]).pipe(
    map(([showLoading, stackState]) => stackState === "empty" && showLoading === false)
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
    tap(() => this.stopLoadingAnimation())
  );

  mainProfilePictureGetter$ = this.ownPicturesService.urls$.pipe(
    map((urls) => {
      this.mainProfilePicture = urls[0];
    })
  );

  @ViewChild("homeContainer", { read: ElementRef }) homeContainer: ElementRef;
  @ViewChild("pic1", { read: ElementRef }) pic1: ElementRef;
  @ViewChild("pic2", { read: ElementRef }) pic2: ElementRef;
  @ViewChild("catchText", { read: ElementRef }) catchText: ElementRef;
  @ViewChild("swipeCards", { read: ElementRef }) swipeCards: ElementRef;
  @ViewChild("backdrop", { read: ElementRef }) backdrop: ElementRef;
  @ViewChild("fish", { read: ElementRef }) fish: ElementRef;

  @HostListener("window:resize", ["$event"])
  onResize() {
    this.screenHeight = window.innerHeight;
    this.screenWidth = window.innerWidth;
  }

  constructor(
    private renderer: Renderer2,
    private swipeStackStore: SwipeStackStore,
    private modalCtrl: ModalController,
    private tabElementRef: TabElementRefService,
    private ownPicturesService: OwnPicturesStore,

    private storeReadiness: StoreReadinessService,
    private loadingCtrl: LoadingController,
    private loading: LoadingService,
    private afAuth: AngularFireAuth,
    private chatboardStore: ChatboardStore,
    private navCtrl: NavController
  ) {
    this.onResize();
  }

  ngOnInit() {
    this.subs.add(this.readinessHandler$.subscribe());
    this.subs.add(this.mainProfilePictureGetter$.subscribe());

    this.swipeStackStore.stackState$.subscribe((c) => console.log("stack state:", c));
  }

  ngAfterViewInit() {
    this.startLoadingAnimation();

    this.viewIsReady$.next(true);
  }

  // For development, to avoid fetching the stack on each reload / document save
  activateSwipeStack() {
    this.subs.add(this.swipeStackStore.activateStore$.subscribe());
  }

  async showSearchCriteria(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: SearchCriteriaComponent,
      enterAnimation: SCenterAnimation(),
      leaveAnimation: SCleaveAnimation(this.tabElementRef.tabsRef, this.homeContainer),
    });

    return modal.present();
  }

  stopLoadingAnimation() {
    this.loadingAnimation?.destroy();
  }

  startLoadingAnimation() {
    this.loadingAnimation = FishSwimAnimation(this.fish);
    this.loadingAnimation.play();
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

    const user = await this.afAuth.currentUser;
    if (!user) return console.error("no user authenticated");

    const loader = await this.loadingCtrl.create({
      ...this.loading.defaultLoadingOptions,
    });
    await loader.present();

    return this.chatboardStore.matches$
      .pipe(
        map((matches) => matches?.[this.latestMatchedProfile.uid]),
        filter((chat) => !!chat),
        take(1),
        tap((chat) => console.log("got one right here", chat)),
        timeout(maxTimeWaitingForChat),
        switchMap((chat) =>
          concat(
            loader.dismiss(),
            this.navCtrl.navigateForward(["main/messenger/" + chat.id]),
            this.destroyCatch()
          )
        ),
        catchError(() => {
          console.log("ah shit it fucking timed out");
          return loader.dismiss();
        })
      )
      .toPromise();
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
