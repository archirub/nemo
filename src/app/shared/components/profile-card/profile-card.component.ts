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
import { Chat, Profile } from "@classes/index";
import { IonContent, IonSlides } from "@ionic/angular";
import { OwnPicturesService } from "@services/pictures/own-pictures/own-pictures.service";
import { Subscription } from "rxjs";

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
  @Input() ownProfile: boolean = false;

  @ViewChild(IonContent) ionContent: IonContent;
  @ViewChild(IonSlides) slides: IonSlides;
  @ViewChildren("bullets", { read: ElementRef }) bullets: QueryList<ElementRef>;
  @ViewChild("content", { read: ElementRef }) content: ElementRef;
  @ViewChild("yes", { read: ElementRef }) yesSwipe: ElementRef;
  @ViewChild("no", { read: ElementRef }) noSwipe: ElementRef;

  picturePaths: Array<string>;
  ownPicturesSub: Subscription;

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

  @ViewChild('intSlides') intSlides: IonSlides;

  @HostListener("touchstart", ["$event"]) touchStart(event) {
    this.X = event.touches[0].clientX;
    this.Y = event.touches[0].clientY;
  }

  constructor(
    private ownPicturesService: OwnPicturesService
  ) {}

  ngOnInit() {
    if (this.ownProfile = true) {
      this.ownPicturesSub = this.ownPicturesService.emptinessObserver$.subscribe();
    }

    this.moreInfo = false;
    // this.picturePaths = [
    //   "https://staticg.sportskeeda.com/editor/2020/06/a19cc-15923264235917.jpg",
    //   "/assets/picture2.jpg",
    //   "/assets/picture3.jpg",
    //   "/assets/picture6.jpg",
    // ];
    // console.log("HERE IS THE interests:", this.profile.interests);
    // console.log("HERE IS THE age:", this.profile.age());
    // console.log("HERE IS THE bio:", this.profile.biography);
    // console.log("HERE IS THE degree:", this.profile.degree);
    // console.log("HERE IS THE society:", this.profile.society);

    this.buildInterestSlides();
    console.log(this.profile);
  }

  ngAfterViewInit() {
    this.slides.lockSwipeToPrev(true);
    setTimeout(() => {
      this.updatePager(); //Timeout necessary, slides finally load once pictures arrive
    }, 4000);
  }

  expandProfile() {
    if (this.moreInfo == true) {
      this.moreInfo = false;
    } else {
      this.moreInfo = true;
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

    this.profile.interests?.forEach(int => {
      count ++

      if (count < 4) {
        pushArray.push(int);
      } else {
        this.interestSlideContent.push(pushArray);
        pushArray = [int];
        count = 1;
      };
    });

    this.interestSlideContent.push(pushArray); //pushes either last interests, or if less than three interests in total
    this.interestsBuilt = true;
  }

  findInterestIcon(interest: string) {
    interest = interest.toLowerCase();
    interest = interest.replace(/\s/g, ''); //remove spaces

    return `/assets/interests/${interest}.png`;
  }

  ngOnDestroy() {
    this.ownPicturesSub.unsubscribe();
  }
}
