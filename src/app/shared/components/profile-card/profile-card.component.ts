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
  OnChanges,
  SimpleChanges,
  ChangeDetectorRef,
  Renderer2,
} from "@angular/core";
import { AngularFireAuth } from "@angular/fire/auth";
import { LessInfoAnimation, MoreInfoAnimation } from "@animations/info.animation";
import { Profile } from "@classes/index";
import { IonContent, IonSlides } from "@ionic/angular";
import { OwnPicturesStore } from "@stores/pictures/own-pictures/own-pictures.service";
import { UserReportingService } from "@services/user-reporting/user-reporting.service";
import { BehaviorSubject, Observable, Subscription } from "rxjs";
import { filter, map, tap, take } from "rxjs/operators";
import { ReportUserComponent } from "../../../main/chats/report-user/report-user.component";

@Component({
  selector: "app-profile-card",
  templateUrl: "./profile-card.component.html",
  styleUrls: ["./profile-card.component.scss"],
})
export class ProfileCardComponent implements OnInit, AfterViewInit {
  @Output() expanded = new EventEmitter();
  @Output() tapped = new EventEmitter();

  @Input() moreInfo: boolean;
  @Input() reportable: boolean = true;
  @Input() isOwnProfile: boolean = false;
  @Input() profile: Profile;

  // this format is used such that the pager is re-updated whenever we get a new input of pictures
  // this also allows for the initial update of the pager
  profilePictures$ = new BehaviorSubject<string[]>([]);
  @Input() set profilePictures(value: string[]) {
    if (Array.isArray(value) && value.length > 0) {
      this.profilePictures$.next(value);

      this.slides
        ?.getActiveIndex()
        .then((currentIndex) => this.updatePager(currentIndex));
    }
  }

  @ViewChild(IonContent) ionContent: IonContent;
  @ViewChild(IonSlides) slides: IonSlides;
  @ViewChildren("bullets", { read: ElementRef }) bullets: QueryList<ElementRef>;
  @ViewChild("content", { read: ElementRef }) content: ElementRef;
  @ViewChild("yes", { read: ElementRef }) yesSwipe: ElementRef;
  @ViewChild("no", { read: ElementRef }) noSwipe: ElementRef;

  // profilePictures$ = new BehaviorSubject<string[]>([]);

  expandAnimation: any;
  collapseAnimation: any;

  interestSlideContent: Array<Array<string>>;
  interestsBuilt: boolean = false;

  loaded: boolean = false;
  socialFound = false; //Make this TRUE when social media acct is loaded

  /* Track touch locations */
  X: number;
  Y: number;

  //for expandInfo animation
  @ViewChild("complete", { read: ElementRef, static: false }) complete: ElementRef; //info after expand
  @ViewChild("header", { read: ElementRef }) header: ElementRef; //name & department container

  @ViewChild("intSlides") intSlides: IonSlides;

  @HostListener("touchstart", ["$event"]) touchStart(event) {
    this.X = event.touches[0].clientX;
    this.Y = event.touches[0].clientY;
  }

  constructor(
    private renderer: Renderer2,
    private afAuth: AngularFireAuth,
    private userReporting: UserReportingService
  ) {}

  ngOnInit() {
    this.slides.ionSlidePrevStart;
    this.moreInfo = false;

    this.buildInterestSlides(this.profile);
  }

  ngAfterViewInit() {
    this.slides?.lockSwipeToPrev(true);
  }

  async reportUser() {
    let userReportedID: string;
    let userReportedName: string;
    let userReportedPicture;
    let userReportingID: string;

    userReportedID = this.profile.uid;
    userReportedName = this.profile.firstName;

    this.profilePictures$.subscribe((res) => {
      userReportedPicture = res[0];
    });

    const getReportingInfo = this.afAuth.user
      .pipe(
        filter((user) => !!user),
        take(1),
        map((user) => (userReportingID = user.uid))
      )
      .toPromise();

    await Promise.all([getReportingInfo]);

    if (!userReportedID || !userReportingID || !userReportedName) return;

    await this.userReporting.displayReportModal(
      ReportUserComponent,
      userReportingID,
      userReportedID,
      userReportedName,
      userReportedPicture
    );
  }

  getContentHeight(): number {
    let height =
      16 +
      Math.ceil(
        100 *
          (this.content.nativeElement.getBoundingClientRect().height / window.innerHeight)
      );
    //height of moreInfo content in %/vh
    //16 = 14% offset of the header + 2% bottom

    return height;
  }

  expandProfile() {
    if (this.moreInfo == true) {
      //intends to hide profile info
      if (this.expandAnimation) {
        this.expandAnimation.destroy(); //Destroy previous animations to avoid buildup
      }

      this.collapseAnimation = LessInfoAnimation(
        this.complete,
        14,
        this.getContentHeight()
      ); //Have to reinitialise animation every time
      this.collapseAnimation.play();

      this.renderer.setStyle(this.header.nativeElement, "boxShadow", "none"); //Remove box shadow from header

      setTimeout(() => {
        this.moreInfo = false; //Allow animation to play before hiding element
      }, 300);
    } else {
      if (this.collapseAnimation) {
        this.collapseAnimation.destroy(); //Destroy previous animations to avoid buildup
      }

      this.expandAnimation = MoreInfoAnimation(
        this.complete,
        14,
        this.getContentHeight()
      ); //Have to reinitialise animation every time
      this.expandAnimation.play();

      this.moreInfo = true; //show element and play animation]
      this.renderer.setStyle(
        this.header.nativeElement,
        "boxShadow",
        "0px 30px 10px -20px rgb(251 251 251)"
      ); //Add box shadow to header
    }
    this.expanded.emit(this.moreInfo);

    setTimeout(() => {
      this.sizeSwipers();

      try {
        this.intSlides.update(); //Fixes broken swiper mechanism that ruins IonSlides snap-swiping
      } catch (TypeError) {
        console.log("No interest slides found."); //No interests selected on profile
      }
    }, 100);

    try {
      this.startSlides();
    } catch (TypeError) {
      console.log("No interest slides to autoplay.");
    }
  }

  async updatePager(currentIndex: number) {
    let index = 0;

    this.bullets.forEach((bullet: ElementRef) => {
      if (currentIndex === index) {
        this.renderer.setStyle(
          bullet.nativeElement,
          "color",
          "var(--ion-color-primary-contrast)"
        ); //Add box shadow to header
      } else {
        this.renderer.setStyle(
          bullet.nativeElement,
          "color",
          "var(--ion-color-dark-tint)"
        ); //Add box shadow to header
      }
      index += 1;
    });
  }

  sizeSwipers() {
    const h = this.content.nativeElement.getBoundingClientRect().height;

    this.renderer.setStyle(this.yesSwipe.nativeElement, "height", `${h}px`);
    this.renderer.setStyle(this.noSwipe.nativeElement, "height", `${h}px`);
    this.renderer.setStyle(this.yesSwipe.nativeElement, "marginTop", "13vh");
    this.renderer.setStyle(this.noSwipe.nativeElement, "marginTop", "13vh");
  }

  async onSlideChange() {
    const [slideIndex, slidesLength] = await Promise.all([
      this.slides.getActiveIndex(),
      this.slides.length(),
    ]);

    await Promise.all([
      this.checkSlide(slideIndex, slidesLength),
      this.updatePager(slideIndex),
    ]);
  }

  async checkSlide(slideIndex: number, slidesLength: number) {
    if (slideIndex === 0) {
      await Promise.all([
        this.slides.lockSwipeToPrev(true),
        this.slides.lockSwipeToNext(false),
      ]);
    } else if (slideIndex === slidesLength - 1) {
      await Promise.all([
        this.slides.lockSwipeToPrev(false),
        this.slides.lockSwipeToNext(true),
      ]);
    } else {
      await Promise.all([
        this.slides.lockSwipeToPrev(false),
        this.slides.lockSwipeToNext(false),
      ]);
    }
  }

  buildInterestSlides(profile: Profile): void {
    if (!profile) return;
    this.interestSlideContent = []; //clear any previous slides, mainly for own profile changes

    let count = 0;
    let pushArray = [];

    profile?.interests?.forEach((int) => {
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

  startSlides() {
    this.intSlides.startAutoplay();
  }

  stopSlides() {
    this.intSlides.stopAutoplay();
  }

  findInterestIcon(interest: string) {
    interest = interest.toLowerCase();
    interest = interest.replace(/\s/g, ""); //remove spaces

    return `/assets/interests/${interest}.svg`;
  }
}
