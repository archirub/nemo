import { FirebaseAuthService } from "@services/firebase-auth/firebase-auth.service";
import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  HostListener,
} from "@angular/core";
import { ModalController } from "@ionic/angular";

import { Observable, Subscription } from "rxjs";

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

@Component({
  selector: "app-home",
  templateUrl: "home.page.html",
  styleUrls: ["home.page.scss"],
})
export class HomePage implements OnInit, OnDestroy {
  log() {
    console.log("click fam");
  }
  swipeProfiles$: Observable<Profile[]>;

  private swipeStackSub: Subscription;

  // PROPERTIES FOR MODAL ANIMATION
  @ViewChild("homeContainer", { read: ElementRef }) homeContainer: ElementRef;
  @ViewChild("searchButton", { read: ElementRef }) searchButton: ElementRef;

  @ViewChild("pic1", { read: ElementRef }) pic1: ElementRef;
  @ViewChild("pic2", { read: ElementRef }) pic2: ElementRef;
  @ViewChild("catchText", { read: ElementRef }) catchText: ElementRef;
  @ViewChild("swipeCards", { read: ElementRef }) swipeCards: ElementRef;
  @ViewChild("fish", { read: ElementRef }) fish: ElementRef;
  @ViewChild("leftFish", { read: ElementRef }) leftFish: ElementRef;
  @ViewChild("rightFish", { read: ElementRef }) rightFish: ElementRef;

  screenHeight: number;
  screenWidth: number;
  @HostListener("window:resize", ["$event"])
  onResize() {
    this.screenHeight = window.innerHeight;
    this.screenWidth = window.innerWidth;
  }

  @ViewChild(SwipeCardComponent) child: SwipeCardComponent;

  constructor(
    private swipeStackStore: SwipeStackStore,
    private currentUserStore: CurrentUserStore,
    private modalCtrl: ModalController,
    private tabElementRef: TabElementRefService,
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

  ngOnInit() {
    this.swipeProfiles$ = this.swipeStackStore.profiles$;
  }

  /**
   * Temporary, just for development, to avoid fetching the stack on each reload / document save
   */
  activateSwipeStack() {
    this.swipeStackSub = this.swipeStackStore.activateStore().subscribe();
    // this.firebaseAuth.logOut();
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

    this.fishSwimAnimation = FishSwimAnimation(this.fish);
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
    this.openCatchAnimation = OpenCatchAnimation(
      this.screenHeight,
      this.screenWidth,
      this.pic1,
      this.pic2,
      this.catchText,
      this.swipeCards
    ); //DO NOT MOVE THIS OUT TO ANOTHER HOOK
    //CANNOT REPLAY UNLESS REINITIALISED HERE BECAUSE IT USES THE SAME ELEMENTS AS CLOSE

    this.matchedName = matchContents[0];
    this.matchedPicture = matchContents[1];

    this.pic1.nativeElement.style.background = `url(${this.currentUser.pictureUrls[0]})`;
    this.pic1.nativeElement.style.backgroundSize = "cover";

    //style match profile to have matched picture
    this.pic2.nativeElement.style.background = `url(${this.matchedPicture})`;
    this.pic2.nativeElement.style.backgroundSize = "cover";

    let catchItems = document.getElementById("catchEls");

    catchItems.style.display = "block";
    this.fish.nativeElement.style.display = "flex";

    var closeButton = document.getElementById("closeAnimation");
    var messageText = document.getElementById("messageText");

    this.openCatchAnimation.play();
    this.fishSwimAnimation.play();

    closeButton.style.display = "block";
    messageText.style.display = "flex";
  }

  closeCatch() {
    this.closeCatchAnimation = CloseCatchAnimation(
      this.screenHeight,
      this.screenWidth,
      this.pic1,
      this.pic2,
      this.catchText,
      this.swipeCards
    ); //DO NOT MOVE THIS OUT TO ANOTHER HOOK
    //CANNOT REPLAY UNLESS REINITIALISED HERE BECAUSE IT USES THE SAME ELEMENTS AS OPEN

    let catchItems = document.getElementById("catchEls");

    this.closeCatchAnimation.play();

    setTimeout(() => {
      catchItems.style.display = "none";

      //Remove background photo from match card
      this.pic2.nativeElement.style.background = "black";
      this.fishSwimAnimation.pause();
    }, 350);
  }

  ngOnDestroy() {
    this.swipeStackSub?.unsubscribe();
  }
}
