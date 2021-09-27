import { FirebaseAuthService } from "@services/firebase-auth/firebase-auth.service";
import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  HostListener,
  Renderer2,
} from "@angular/core";
import { ModalController } from "@ionic/angular";

import { Observable, Subscription } from "rxjs";
import { map } from "rxjs/operators";

import { SearchCriteriaComponent } from "./search-criteria/search-criteria.component";

import { Profile } from "@classes/index";
import { CurrentUserStore, SwipeStackStore } from "@stores/index";

import {
  SCenterAnimation,
  SCleaveAnimation,
  OpenCatchAnimation,
  CloseCatchAnimation,
  FishSwimAnimation,
} from "@animations/index";

import { TabElementRefService } from "src/app/main/tab-menu/tab-element-ref.service";
import { SwipeCardComponent } from "./swipe-card/swipe-card.component";
import { AngularFirestore } from "@angular/fire/compat/firestore";
import { OwnPicturesStore } from "@stores/pictures/own-pictures/own-pictures.service";

@Component({
  selector: "app-home",
  templateUrl: "home.page.html",
  styleUrls: ["home.page.scss"],
})
export class HomePage implements OnInit, OnDestroy {
  swipeProfiles$: Observable<Profile[]>;

  private swipeStackSub: Subscription;
  private ownPicturesSub: Subscription;

  // PROPERTIES FOR MODAL ANIMATION
  @ViewChild("homeContainer", { read: ElementRef }) homeContainer: ElementRef;
  // @ViewChild("searchButton", { read: ElementRef }) searchButton: ElementRef;

  @ViewChild("pic1", { read: ElementRef }) pic1: ElementRef;
  @ViewChild("pic2", { read: ElementRef }) pic2: ElementRef;
  @ViewChild("catchText", { read: ElementRef }) catchText: ElementRef;
  @ViewChild("swipeCards", { read: ElementRef }) swipeCards: ElementRef;
  @ViewChild("backdrop", { read: ElementRef }) backdrop: ElementRef;
  // @ViewChild("leftFish", { read: ElementRef }) leftFish: ElementRef;
  // @ViewChild("rightFish", { read: ElementRef }) rightFish: ElementRef;

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
    private firebaseAuth: FirebaseAuthService,
    private fs: AngularFirestore
  ) {
    this.onResize();
  }

  modal: HTMLIonModalElement;
  SCenterAnimation;
  SCleaveAnimation;

  openCatchAnimation;
  closeCatchAnimation;
  fishEnterAnimation;
  fishSwimAnimation;
  matchedName: string;
  matchedPicture;
  currentUser; //profile
  currentUserSub; //subscription
  profilePictures;

  public catchMessages: Array<string> = [
    'You guys are too much...',
    'Play it cool, play it cool...',
    'You two are straight up killing it!',
    'This looks fire...',
    'Love comes around only so often babe...',
    'Go ooooooon!',
    'The stars are aligned!',
    'Wanna whole lotta love?'
  ];
  public chosenCatchMsg: string;

  ngOnInit() {
    this.swipeProfiles$ = this.swipeStackStore.profiles$;

    this.ownPicturesService.urls$
      .pipe(map((urls) => this.updateProfilePictures(urls)))
      .subscribe();
  }

  selectRandomCatch() {
    this.chosenCatchMsg =
      this.catchMessages[Math.floor(Math.random() * this.catchMessages.length)];
  }

  /**
   * Temporary, just for development, to avoid fetching the stack on each reload / document save
   */
  activateSwipeStack() {
    this.swipeStackSub = this.swipeStackStore.activateStore().subscribe();
    // this.firebaseAuth.logOut();
  }

  updateProfilePictures(urls: string[]) {
    this.profilePictures = JSON.parse(JSON.stringify(urls));
  }

  ionViewDidEnter() {
    // Subscription for chat doc creation in case of match
    this.currentUserSub = this.currentUserStore.user$.subscribe((profile) => {
      this.currentUser = profile;
    });

    this.SCenterAnimation = SCenterAnimation(
      this.tabElementRef.tabRef,
      this.homeContainer
    );
    this.SCleaveAnimation = SCleaveAnimation(
      this.tabElementRef.tabRef,
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

  playCatch(matchContents) {
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

    this.matchedName = matchContents[0];
    this.matchedPicture = matchContents[1];

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
      `url(${this.matchedPicture})`
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

  closeCatch() {
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

  ngOnDestroy() {
    this.swipeStackSub?.unsubscribe();
  }
}
