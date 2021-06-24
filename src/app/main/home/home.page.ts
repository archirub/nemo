import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  HostListener
} from "@angular/core";
import { ModalController } from "@ionic/angular";

import { forkJoin, from, interval, Observable, of, Subscription } from "rxjs";
import { throttle, filter, tap, take, delay, map } from "rxjs/operators";

import { SearchCriteriaComponent } from "./search-criteria/search-criteria.component";

import { Profile, SearchCriteria } from "@classes/index";
import { CurrentUserStore, SearchCriteriaStore, SwipeOutcomeStore, SwipeStackStore } from "@stores/index";

import { 
  SCenterAnimation, 
  SCleaveAnimation, 
  OpenCatchAnimation,
  CloseCatchAnimation,
  FishSwimAnimation,
  FishEnterAnimation
 } from "@animations/index";

import { FormatService } from "@services/index";
import { TabElementRefService } from "src/app/main/tab-menu/tab-element-ref.service";
import { SwipeCardComponent } from "./swipe-card/swipe-card.component";
import { AngularFireStorage } from "@angular/fire/storage";
import { PicturesService } from "@services/pictures/pictures.service";
import { OwnPicturesService } from "@services/pictures/own-pictures/own-pictures.service";

@Component({
  selector: "app-home",
  templateUrl: "home.page.html",
  styleUrls: ["home.page.scss"],
})
export class HomePage implements OnInit, OnDestroy {

  testPicture: Observable<any>;

  swipeProfiles: Observable<Profile[]>;
  private swipeStackRefill$: Subscription;

  private searchCriteria: SearchCriteria = new SearchCriteria({});
  private searchCriteria$: Subscription;

  // PROPERTIES FOR MODAL ANIMATION
  @ViewChild("homeContainer", { read: ElementRef }) homeContainer: ElementRef;
  @ViewChild("searchButton", { read: ElementRef }) searchButton: ElementRef;

  @ViewChild('pic1', { read: ElementRef }) pic1: ElementRef;
  @ViewChild('pic2', { read: ElementRef }) pic2: ElementRef;
  @ViewChild('catchText', { read: ElementRef }) catchText: ElementRef;
  @ViewChild('swipeCards', { read: ElementRef }) swipeCards: ElementRef;
  @ViewChild('fish', { read: ElementRef }) fish: ElementRef;
  @ViewChild('leftFish', { read: ElementRef }) leftFish: ElementRef;
  @ViewChild('rightFish', { read: ElementRef }) rightFish: ElementRef;

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
    private SCstore: SearchCriteriaStore,
    private currentUserStore: CurrentUserStore,
    private modalCtrl: ModalController,
    private tabElementRef: TabElementRefService,
    private swipeOutcomeStore: SwipeOutcomeStore,
    private format: FormatService,
    private afStorage: AngularFireStorage,
    private picturesService: PicturesService,
    private ownPicturesService: OwnPicturesService
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
  currentUser$; //subscription

  async ngOnInit() {
    this.searchCriteria$ = this.SCstore.searchCriteria.subscribe((SC) => {
      this.searchCriteria = SC;
    });
    // Makes sure swipe stack is only filled when its length is smaller or equal to a given
    // length, and that no new query to refill the swipe stack is made while a query
    // is already being processed.
    // this.swipeStackRefill$ = this.swipeProfiles
    //   .pipe(
    //     filter(
    //       (profiles) => profiles /*&& profiles.length !== 0*/ && profiles.length <= 4
    //     ),
    //     throttle(async () => {
    //       console.log("Refilling swipe stack");
    //       await this.swipeOutcomeStore.registerSwipeChoices();
    //       await this.swipeStackStore.addToSwipeStackQueue(this.searchCriteria);
    //     })
    //   )
    //   .subscribe();
  }

  ionViewDidEnter() {
    // Subscription for chat doc creation in case of match
    this.currentUser$ = this.currentUserStore.user$.subscribe(
      (profile) => {
        this.currentUser = profile;
      }
    );

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
    if (!modal) return;
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
    this.pic1.nativeElement.style.backgroundSize = 'cover';

    //style match profile to have matched picture
    this.pic2.nativeElement.style.background = `url(${this.matchedPicture})`;
    this.pic2.nativeElement.style.backgroundSize = 'cover';

    let catchItems = document.getElementById("catchEls");

    catchItems.style.display = "block";
    this.fish.nativeElement.style.display = "flex";

    var closeButton = document.getElementById('closeAnimation');
    var messageText = document.getElementById('messageText');

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
      this.pic2.nativeElement.style.background = 'black';
      this.fishSwimAnimation.pause();
    }, 350);
  }

  ngOnDestroy() {
    this.searchCriteria$.unsubscribe();
    //this.swipeStackRefill$.unsubscribe();
  }
}
