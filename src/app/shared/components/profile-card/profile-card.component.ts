import {
  Component,
  ElementRef,
  QueryList,
  Input,
  Output,
  OnInit,
  AfterViewInit,
  ViewChild,
  EventEmitter,
  ViewChildren,
  HostListener,
} from "@angular/core";
import { LessInfoAnimation, MoreInfoAnimation } from "@animations/info.animation";
import { Chat, Profile } from "@classes/index";
import { IonContent, IonSlides } from "@ionic/angular";
import { OwnPicturesStore } from "@stores/pictures-stores/own-pictures-store/own-pictures.service";
import { iif, Observable, of, Subscription } from "rxjs";

@Component({
  selector: "app-profile-card",
  templateUrl: "./profile-card.component.html",
  styleUrls: ["./profile-card.component.scss"],
})
export class ProfileCardComponent implements OnInit, AfterViewInit {
  @Output() expanded = new EventEmitter();
  @Output() tapped = new EventEmitter();

  @Input() moreInfo: boolean;
  @Input() profile: Profile;
  @Input() reportable: boolean = true;
  @Input() isOwnProfile: boolean = false;

  @ViewChild(IonContent) ionContent: IonContent;
  @ViewChild(IonSlides) slides: IonSlides;
  @ViewChildren("bullets", { read: ElementRef }) bullets: QueryList<ElementRef>;
  @ViewChild("content", { read: ElementRef }) content: ElementRef;
  @ViewChild("yes", { read: ElementRef }) yesSwipe: ElementRef;
  @ViewChild("no", { read: ElementRef }) noSwipe: ElementRef;

  profilePictures$: Observable<string[]>;

  expandAnimation: any;
  collapseAnimation: any;

  interestSlideContent: Array<Array<string>>;
  interestsBuilt: boolean = false;

  loaded: boolean = false;
  socialFound = false; //Make this TRUE when social media acct is loaded

  /* Track touch locations */
  X: number;
  Y: number;

  //for sizing on chats page
  @ViewChild("fullCard", { read: ElementRef }) swipe: ElementRef; //full swipe-card id
  @ViewChild("snippet", { read: ElementRef }) snippet: ElementRef; //info before expand
  @ViewChild("complete", { read: ElementRef, static: false }) complete: ElementRef; //info after expand
  @ViewChild("picSlides", { read: ElementRef }) picture: ElementRef; //picture slides
  @ViewChildren("pic", { read: ElementRef }) pictures: QueryList<ElementRef>; //pictures
  @ViewChild("name", { read: ElementRef }) name: ElementRef; //name
  @ViewChild("department", { read: ElementRef }) department: ElementRef; //department
  @ViewChild("header", { read: ElementRef }) header: ElementRef; //name & department container
  @ViewChild("question", { read: ElementRef }) question: ElementRef; //question
  @ViewChild("answer", { read: ElementRef }) answer: ElementRef; //answer
  @ViewChild("QandA", { read: ElementRef }) QandA: ElementRef; //question & answer container
  @ViewChild("shadow", { read: ElementRef }) shadow: ElementRef; //photo shadow div

  @ViewChild("intSlides") intSlides: IonSlides;

  @HostListener("touchstart", ["$event"]) touchStart(event) {
    this.X = event.touches[0].clientX;
    this.Y = event.touches[0].clientY;
  }

  constructor(private ownPicturesService: OwnPicturesStore) {}

  ngOnInit() {
    this.moreInfo = false;

    this.buildInterestSlides();

    // if this is own profile, then use the pictures from the ownPicturesStore,
    // (as they are then managed and automatically updated),
    // otherwise use the pictures from the profile class
    // (would be simplier if you just make the ownPicturesService such that it updates the
    // pictureUrls property of the ownProfileStore, instead of having its own BehaviorSubject)
    this.profilePictures$ = iif(
      () => this.isOwnProfile,
      this.ownPicturesService.urls$,
      of(this.profile.pictureUrls)
    );
  }

  ngAfterViewInit() {
    //Animations for profile info sliding up and down
    this.expandAnimation = MoreInfoAnimation(this.complete, 18, 85);

    this.collapseAnimation = LessInfoAnimation(this.complete, 18, 85);

    this.slides.lockSwipeToPrev(true);
    setTimeout(() => {
      this.updatePager(); //Timeout necessary, slides finally load once pictures arrive
    }, 4000);
  }

  expandProfile() {
    if (this.moreInfo == true) {
      //intends to hide profile info
      if (this.expandAnimation) {
        this.expandAnimation.destroy(); //Destroy previous animations to avoid buildup
      }

      this.collapseAnimation = LessInfoAnimation(this.complete, 85, 18); //Have to reinitialise animation every time

      this.collapseAnimation.play();

      setTimeout(() => {
        this.moreInfo = false; //Allow animation to play before hiding element
      }, 300);
    } else {
      if (this.collapseAnimation) {
        this.collapseAnimation.destroy(); //Destroy previous animations to avoid buildup
      }

      this.expandAnimation = MoreInfoAnimation(this.complete, 85, 18); //Have to reinitialise animation every time

      this.moreInfo = true; //show element and play animation
      this.expandAnimation.play();
    }
    this.expanded.emit(this.moreInfo);

    setTimeout(() => {
      this.sizeSwipers();
      this.intSlides.update(); //Fixes broken swiper mechanism that ruins IonSlides snap-swiping
    }, 100);
  }

  async updatePager() {
    var current = await this.slides.getActiveIndex();
    let index = 0;

    this.bullets.forEach((bullet: ElementRef) => {
      if (current === index) {
        bullet.nativeElement.style.color = "var(--ion-color-primary-contrast)";
      } else {
        bullet.nativeElement.style.color = "var(--ion-color-dark-tint)";
      }
      index += 1;
    });
  }

  sizeSwipers() {
    var h = this.content.nativeElement.getBoundingClientRect().height;

    this.yesSwipe.nativeElement.style.height = `${h}px`;
    this.noSwipe.nativeElement.style.height = `${h}px`;
    this.yesSwipe.nativeElement.style.marginTop = "13vh";
    this.noSwipe.nativeElement.style.marginTop = "13vh";
  }

  async checkSlide() {
    var current = await this.slides.getActiveIndex();
    var len = await this.slides.length();

    if (current === 0) {
      this.slides.lockSwipeToPrev(true);
      this.slides.lockSwipeToNext(false);
    } else if (current === len - 1) {
      this.slides.lockSwipeToPrev(false);
      this.slides.lockSwipeToNext(true);
    } else {
      this.slides.lockSwipeToPrev(false);
      this.slides.lockSwipeToNext(false);
    }
  }

  buildInterestSlides() {
    this.interestSlideContent = []; //clear any previous slides, mainly for own profile changes

    let count = 0;
    let pushArray = [];

    this.profile.interests?.forEach((int) => {
      count++;

      if (count < 4) {
        pushArray.push(int);
      } else {
        this.interestSlideContent.push(pushArray);
        pushArray = [int];
        count = 1;
      }
    });

    this.interestSlideContent.push(pushArray); //pushes either last interests, or if less than three interests in total
    this.interestsBuilt = true;
  }

  findInterestIcon(interest: string) {
    interest = interest.toLowerCase();
    interest = interest.replace(/\s/g, ""); //remove spaces

    return `/assets/interests/${interest}.png`;
  }

  ngOnDestroy() {}
}
