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
  Renderer2,
  OnDestroy,
} from "@angular/core";
import { IonSlides } from "@ionic/angular";
import { AngularFireAuth } from "@angular/fire/auth";

import {
  BehaviorSubject,
  combineLatest,
  firstValueFrom,
  ReplaySubject,
  Subscription,
} from "rxjs";
import { filter, map, take, startWith, first, switchMap } from "rxjs/operators";

import { ReportUserComponent } from "../../../main/chats/report-user/report-user.component";

import { UserReportingService } from "@services/user-reporting/user-reporting.service";

import { Profile } from "@classes/index";
import { LessInfoAnimation, MoreInfoAnimation } from "@animations/info.animation";

@Component({
  selector: "app-profile-card",
  templateUrl: "./profile-card.component.html",
  styleUrls: ["./profile-card.component.scss"],
})
export class ProfileCardComponent implements OnInit, AfterViewInit, OnDestroy {
  counter = 0;
  expandAnimation: any;
  collapseAnimation: any;
  interestSlideContent: Array<Array<string>>;
  interestsBuilt: boolean = false;
  loaded: boolean = false;
  socialFound = false; //Make this TRUE when social media acct is loaded
  X: number; /* Track touch locations */
  Y: number;

  subs = new Subscription();

  @Output() expanded = new EventEmitter();
  @Output() tapped = new EventEmitter();
  @Input() moreInfo: boolean = false;
  @Input() reportable: boolean = true;
  @Input() isOwnProfile: boolean = false;
  @Input() profile: Profile;
  @Input() headerBottom: number; //in %
  @Input() set profilePictures(value: string[]) {
    if (!Array.isArray(value)) return;

    // absolutely necessary. This is because empty strings can be coming in
    // in the array when the swipeStackStore has attempted to fetch that picture but hasn't found anything
    // there being an empty string is necessary to signify to the swipeStackStore that it has already tried fetching that pic with no results
    let pics = value.slice(0, this.pictureCount);
    pics = [...pics, ...Array(this.pictureCount - pics.length).fill("")];

    this.profilePictures$.next(pics);
  }

  @ViewChildren("bullets", { read: ElementRef }) bullets: QueryList<ElementRef>;
  @ViewChild("content", { read: ElementRef }) content: ElementRef;
  @ViewChild("yes", { read: ElementRef }) yesSwipe: ElementRef;
  @ViewChild("no", { read: ElementRef }) noSwipe: ElementRef;
  @ViewChild("complete", { read: ElementRef, static: false }) complete: ElementRef; //info after expand
  @ViewChild("header", { read: ElementRef }) header: ElementRef; //name & department container
  @ViewChild("intSlides") intSlides: IonSlides;

  slidesRef$ = new ReplaySubject<IonSlides>(1); // made public for use in swipe stack store and messenger page
  @ViewChild(IonSlides) set slidesRefSetter(ref: IonSlides) {
    if (ref) this.slidesRef$.next(ref);
  }

  @HostListener("touchstart", ["$event"]) touchStart(event) {
    this.X = event.touches[0].clientX;
    this.Y = event.touches[0].clientY;
  }

  // isReady$ = new BehaviorSubject<boolean>(false); // used in parent page (created for use in ownProfile page)

  // this format is used such that the pager is re-updated whenever we get a new input of pictures
  // this also allows for the initial update of the pager
  profilePictures$ = new BehaviorSubject<string[]>([]);

  profilePicturesWithDefault$ = this.profilePictures$.pipe(
    map((pp) => pp ?? "/assets/icons/icon-192x192.png")
  );

  pagerHandler$ = this.slidesRef$.pipe(
    first(),
    switchMap((slidesRef) =>
      combineLatest([this.profilePictures$, slidesRef.ionSlideWillChange]).pipe(
        map(([_, s]) => (s.target as any)?.swiper?.realIndex as number),
        startWith(0), // for initial
        map((index) => this.updatePager(index))
      )
    )
  );

  get pictureCount(): number {
    return this.profile?.pictureCount ?? 0;
  }

  get pictureCountArray(): string[] {
    return Array(this.pictureCount).fill("");
  }

  constructor(
    private renderer: Renderer2,
    private afAuth: AngularFireAuth,
    private userReporting: UserReportingService
  ) {}

  ngOnInit() {
    this.buildInterestSlides(this.profile);
  }

  ngAfterViewInit() {
    this.lockSwipeToPrev(true);
    this.subs.add(this.pagerHandler$.subscribe());
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

    const getReportingInfo = firstValueFrom(
      this.afAuth.user.pipe(
        filter((user) => !!user),
        take(1),
        map((user) => (userReportingID = user.uid))
      )
    );

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

  updatePager(currentIndex: number) {
    this.bullets.forEach((bullet: ElementRef, i) => {
      if (currentIndex === i) {
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
      this.getSlidesIndex(),
      this.getSlidesLength(),
    ]);

    await this.checkSlide(slideIndex, slidesLength);
  }

  async checkSlide(slideIndex: number, slidesLength: number) {
    if (slideIndex === 0) {
      await Promise.all([this.lockSwipeToPrev(true), this.lockSwipeToNext(false)]);
    } else if (slideIndex === slidesLength - 1) {
      await Promise.all([this.lockSwipeToPrev(false), this.lockSwipeToNext(true)]);
    } else {
      await Promise.all([this.lockSwipeToPrev(false), this.lockSwipeToNext(false)]);
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

  async lockSwipeToPrev(bool: boolean) {
    return firstValueFrom(this.slidesRef$).then((ref) => ref.lockSwipeToPrev(bool));
  }

  async lockSwipeToNext(bool: boolean) {
    return firstValueFrom(this.slidesRef$).then((ref) => ref.lockSwipeToNext(bool));
  }

  async getSlidesIndex() {
    return firstValueFrom(this.slidesRef$.pipe(switchMap((ref) => ref.getActiveIndex())));
  }

  async getSlidesLength() {
    return firstValueFrom(this.slidesRef$.pipe(switchMap((ref) => ref.length())));
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

  ngOnDestroy() {
    this.subs.unsubscribe();
  }
}
