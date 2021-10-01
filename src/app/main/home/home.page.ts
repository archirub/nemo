import { FirebaseAuthService } from "@services/firebase-auth/firebase-auth.service";
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

import {
  BehaviorSubject,
  combineLatest,
  concat,
  Observable,
  of,
  Subscription,
} from "rxjs";
import {
  catchError,
  delay,
  distinctUntilChanged,
  filter,
  map,
  startWith,
  switchMap,
  take,
  tap,
  timeout,
  timeoutWith,
} from "rxjs/operators";

import { SearchCriteriaComponent } from "./search-criteria/search-criteria.component";

import { Profile } from "@classes/index";
import { ChatboardStore, CurrentUserStore, SwipeStackStore } from "@stores/index";

import {
  SCenterAnimation,
  SCleaveAnimation,
  OpenCatchAnimation,
  CloseCatchAnimation,
  FishSwimAnimation,
} from "@animations/index";

import { TabElementRefService } from "src/app/main/tab-menu/tab-element-ref.service";
import { SwipeCardComponent } from "./swipe-card/swipe-card.component";
import { AngularFirestore } from "@angular/fire/firestore";
import { AngularFireAuth } from "@angular/fire/auth";
import { OwnPicturesStore } from "@stores/pictures/own-pictures/own-pictures.service";
import { StoreReadinessService } from "@services/store-readiness/store-readiness.service";
import { Router } from "@angular/router";
import { LoadingService } from "@services/loading/loading.service";

@Component({
  selector: "app-home",
  templateUrl: "home.page.html",
  styleUrls: ["home.page.scss"],
})
export class HomePage implements OnInit, OnDestroy, AfterViewInit {
  private subs = new Subscription();
  loadingAnimation: Animation;

  showLoading$ = new BehaviorSubject<boolean>(true);
  showEmptyPrompt$ = combineLatest([
    this.showLoading$,
    this.swipeStackStore.stackState$,
  ]).pipe(
    map(([showLoading, stackState]) => stackState === "empty" && showLoading === false)
  );

  private viewIsReady$ = new BehaviorSubject<boolean>(false);
  get pageIsReady$() {
    return combineLatest([this.viewIsReady$, this.storeReadiness.home$]).pipe(
      map(([a, b]) => a && b),
      distinctUntilChanged()
    );
  }

  // PROPERTIES FOR MODAL ANIMATION
  @ViewChild("homeContainer", { read: ElementRef }) homeContainer: ElementRef;

  @ViewChild("pic1", { read: ElementRef }) pic1: ElementRef;
  @ViewChild("pic2", { read: ElementRef }) pic2: ElementRef;
  @ViewChild("catchText", { read: ElementRef }) catchText: ElementRef;
  @ViewChild("swipeCards", { read: ElementRef }) swipeCards: ElementRef;
  @ViewChild("backdrop", { read: ElementRef }) backdrop: ElementRef;
  @ViewChild("fish", { read: ElementRef }) fish: ElementRef;

  screenHeight: number;
  screenWidth: number;
  @HostListener("window:resize", ["$event"])
  onResize() {
    this.screenHeight = window.innerHeight;
    this.screenWidth = window.innerWidth;
  }

  @ViewChild(SwipeCardComponent) child: SwipeCardComponent;

  constructor(
    private renderer: Renderer2,
    private swipeStackStore: SwipeStackStore,
    private currentUserStore: CurrentUserStore,
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

  modal: HTMLIonModalElement;
  SCenterAnimation: (baseEl: any) => Animation;
  SCleaveAnimation: (baseEl: any) => Animation;

  openCatchAnimation: Animation;
  closeCatchAnimation: Animation;

  latestMatchedProfile: Profile | null;

  currentUser; //profile
  currentUserSub; //subscription
  profilePictures;

  public catchMessages: Array<string> = [
    "You guys are too much...",
    "Play it cool, play it cool...",
    "You two are straight up killing it!",
    "This looks fire...",
    "Love comes around only so often babe...",
    "Go ooooooon!",
    "The stars are aligned!",
    "Wanna whole lotta love?",
  ];
  public chosenCatchMsg: string;

  ngOnInit() {
    this.readinessHandler();

    this.subs.add(
      this.ownPicturesService.urls$
        .pipe(map((urls) => this.updateProfilePictures(urls)))
        .subscribe()
    );

    this.swipeStackStore.stackState$.subscribe((c) => console.log("stack state:", c));
  }

  get swipeProfiles$() {
    return this.pageIsReady$.pipe(
      switchMap((isReady) => (isReady ? this.swipeStackStore.profiles$ : of([])))
    );
  }

  readinessHandler() {
    this.subs.add(
      this.pageIsReady$
        .pipe(
          filter((isReady) => isReady),
          take(1),
          tap(() => this.showLoading$.next(false)),
          tap(() => this.stopLoadingAnimation())
        )
        .subscribe()
    );
  }

  stopLoadingAnimation() {
    this.loadingAnimation?.destroy();
  }

  startLoadingAnimation() {
    this.loadingAnimation = FishSwimAnimation(this.fish);
    this.loadingAnimation.play();
  }

  selectRandomCatch() {
    this.chosenCatchMsg =
      this.catchMessages[Math.floor(Math.random() * this.catchMessages.length)];
  }

  /**
   * Temporary, just for development, to avoid fetching the stack on each reload / document save
   */
  activateSwipeStack() {
    this.subs.add(this.swipeStackStore.activateStore().subscribe());
    // this.firebaseAuth.logOut();
  }

  updateProfilePictures(urls: string[]) {
    this.profilePictures = JSON.parse(JSON.stringify(urls));
  }

  ngAfterViewInit() {
    this.startLoadingAnimation();

    // Subscription for chat doc creation in case of match
    this.currentUserSub = this.currentUserStore.user$.subscribe((profile) => {
      this.currentUser = profile;
    });

    this.SCenterAnimation = SCenterAnimation(
      this.tabElementRef.tabsRef,
      this.homeContainer
    );
    this.SCleaveAnimation = SCleaveAnimation(
      this.tabElementRef.tabsRef,
      this.homeContainer
    );

    //this.fishEnterAnimation = FishEnterAnimation(this.screenWidth, this.leftFish, this.rightFish);

    this.modalCtrl
      .create({
        component: SearchCriteriaComponent,
        enterAnimation: this.SCenterAnimation,
        leaveAnimation: this.SCleaveAnimation,
      })
      .then((m) => {
        this.modal = m;
        this.onModalDismiss(this.modal);
      });

    this.viewIsReady$.next(true);
  }

  async presentSCmodal(): Promise<void> {
    return await this.modal.present();
  }

  // Used to preload modal as soon as the previous SC window was dismissed
  onModalDismiss(modal: HTMLIonModalElement) {
    modal.onDidDismiss().then(() => {
      this.modalCtrl
        .create({
          component: SearchCriteriaComponent,
          enterAnimation: this.SCenterAnimation,
          leaveAnimation: this.SCleaveAnimation,
        })
        .then((m) => {
          this.modal = m;
          return this.modal;
        })
        .then((m) => this.onModalDismiss(m));
    });
  }

  playCatch(matchedProfile: Profile) {
    this.latestMatchedProfile = matchedProfile;

    this.selectRandomCatch();

    this.openCatchAnimation = OpenCatchAnimation(
      this.screenHeight,
      this.screenWidth,
      this.pic1,
      this.pic2,
      this.catchText,
      this.backdrop,
      this.swipeCards
    ); //DO NOT MOVE THIS OUT TO ANOTHER HOOK
    //CANNOT REPLAY UNLESS REINITIALISED HERE BECAUSE IT USES THE SAME ELEMENTS AS CLOSE

    this.renderer.setStyle(
      this.pic1.nativeElement,
      "background",
      `url(${this.profilePictures[0]})`
    );
    this.renderer.setStyle(this.pic1.nativeElement, "backgroundSize", "cover");

    //style match profile to have matched picture
    this.renderer.setStyle(
      this.pic2.nativeElement,
      "background",
      `url(${matchedProfile.pictureUrls[0]})`
    );
    this.renderer.setStyle(this.pic2.nativeElement, "backgroundSize", "cover");

    let catchItems = document.getElementById("catchEls");

    this.renderer.setStyle(catchItems, "display", "block");

    const closeButton = document.getElementById("closeAnimation");
    const messageText = document.getElementById("messageText");
    const messageText2 = document.getElementById("messageText2");

    this.openCatchAnimation.play();

    this.renderer.setStyle(closeButton, "display", "block");
    this.renderer.setStyle(messageText, "display", "flex");
    this.renderer.setStyle(messageText2, "display", "flex");
  }

  async closeCatch() {
    this.closeCatchAnimation = CloseCatchAnimation(
      this.screenHeight,
      this.screenWidth,
      this.pic1,
      this.pic2,
      this.catchText,
      this.backdrop,
      this.swipeCards
    ); //DO NOT MOVE THIS OUT TO ANOTHER HOOK
    //CANNOT REPLAY UNLESS REINITIALISED HERE BECAUSE IT USES THE SAME ELEMENTS AS OPEN

    let catchItems = document.getElementById("catchEls");

    this.closeCatchAnimation.play();

    setTimeout(() => {
      this.renderer.setStyle(catchItems, "display", "none");

      //Remove background photo from match card
      this.renderer.setStyle(this.pic2.nativeElement, "background", "black");
    }, 350);
  }

  async goToChat() {
    const maxTimeWaitingForChat = 6000; // i.e. 6 seconds

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
    this.closeCatchAnimation?.destroy();
    this.openCatchAnimation?.destroy();
    let catchItems = document.getElementById("catchEls");
    this.renderer.setStyle(catchItems, "display", "none");
    this.renderer.setStyle(this.pic2.nativeElement, "background", "black");
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }
}
