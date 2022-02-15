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
  HostListener,
  Renderer2,
  OnDestroy,
  ViewChildren,
  AfterContentChecked,
} from "@angular/core";
import { IonSlides } from "@ionic/angular";

import {
  BehaviorSubject,
  combineLatest,
  firstValueFrom,
  ReplaySubject,
  Subscription,
} from "rxjs";
import { map, take, tap } from "rxjs/operators";

import { ReportUserComponent } from "../../../main/chats/report-user/report-user.component";

import { UserReportingService } from "@services/user-reporting/user-reporting.service";

import { Profile } from "@classes/index";
import { LessInfoAnimation, MoreInfoAnimation } from "@animations/info.animation";
import { GlobalErrorHandler } from "@services/errors/global-error-handler.service";

import { SwiperComponent } from "swiper/angular";
import { SwiperOptions } from "swiper";
import { DEFAULT_PICTURE_URL } from "@interfaces/profile.model";

@Component({
  selector: "app-profile-card",
  templateUrl: "./profile-card.component.html",
  styleUrls: ["./profile-card.component.scss"],
})
export class ProfileCardComponent
  implements OnInit, AfterViewInit, OnDestroy, AfterContentChecked
{
  swiperConfig: SwiperOptions = {
    slidesOffsetAfter: 0,
    slidesPerView: 1,
    resistanceRatio: 0, // to remove the bounce at the start and end of slides
  };

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
  @Input() fixedHeader: boolean = true; //THIS IS A LAST MINUTE FIX BECAUSE I DON'T HAVE THE TIME TO FIGURE OUT WHAT'S GOING ON??
  @Input() messengerProfile: boolean = false;
  @Input() set profilePictures(value: string[]) {
    if (!Array.isArray(value)) return;

    // absolutely necessary. This is because empty strings can be coming in
    // in the array when the swipeStackStore has attempted to fetch that picture but hasn't found anything
    // there being an empty string is necessary to signify to the swipeStackStore that it has already tried fetching that pic with no results
    const pictureCount = this.pictureCount;
    let pics = value.slice(0, pictureCount);
    const diffWithPictureCount = pictureCount - pics.length;
    // done conditionally because I was getting some weird behaviour
    // when diffWithPictureCount was 0 and [...pics, ...Array(diffWithPictureCount).fill("")] was used anyway
    // where ...Array(0) would add two empty strings
    if (diffWithPictureCount >= 1) {
      pics = [...pics, ...Array(diffWithPictureCount).fill("")];
    }

    this.profilePictures$.next(pics);
  }

  // necessary / work around for proper initialization of swiper
  async initPicSlides() {
    return firstValueFrom(this.picSlides$.pipe(map((ps) => ps.updateSwiper({}))));
  }

  @ViewChild("content", { read: ElementRef }) content: ElementRef;
  @ViewChild("yes", { read: ElementRef }) yesSwipe: ElementRef;
  @ViewChild("no", { read: ElementRef }) noSwipe: ElementRef;
  @ViewChild("complete", { read: ElementRef, static: false }) complete: ElementRef; //info after expand
  @ViewChild("header", { read: ElementRef }) header: ElementRef; //name & department container
  @ViewChild("intSlides") intSlides: IonSlides;

  private bulletsRef$ = new ReplaySubject<QueryList<ElementRef>>(1); // made public for use in swipe stack store and messenger page
  @ViewChildren("bullets", { read: ElementRef }) set bulletsRefSetter(
    ref: QueryList<ElementRef>
  ) {
    if (ref) {
      // console.log("bulletsRef$ is ", ref, Array.from(ref));
      this.bulletsRef$.next(ref);
    }
  }

  public picSlides$ = new ReplaySubject<SwiperComponent>(1); // made public for use in swipe stack store and messenger page
  @ViewChild(SwiperComponent) set picSlidesSetter(ref: SwiperComponent) {
    if (ref) this.picSlides$.next(ref);
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
    map((pics) => pics.map((url) => (!!url ? url : DEFAULT_PICTURE_URL))),
    map((pics) => (pics.length <= 0 ? [DEFAULT_PICTURE_URL] : pics))
  );

  pagerHandler$ = combineLatest([
    this.picSlides$,
    this.profilePictures$,
    this.bulletsRef$,
  ]).pipe(
    take(1),
    tap(([_, __, bulletsRef]) => this.updatePager(0, bulletsRef)), // for pager init
    map(([slidesRef, _, bulletsRef]) =>
      slidesRef.swiperRef.on("slideChange", (swiper) =>
        this.updatePager(swiper.realIndex, bulletsRef)
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
    private errorHandler: GlobalErrorHandler,
    private userReporting: UserReportingService
  ) {}

  ngOnInit() {
    this.buildInterestSlides(this.profile);
  }

  ngAfterContentChecked() {
    this.initPicSlides();
  }

  ngAfterViewInit() {
    this.subs.add(this.pagerHandler$.subscribe());
  }

  async reportUser() {
    const userReportedID = this.profile.uid;
    const userReportedName = this.profile.firstName;
    const userReportedPicture = await firstValueFrom(
      this.profilePicturesWithDefault$.pipe(map((pp) => pp[0]))
    );

    const userReporting = await this.errorHandler.getCurrentUser();
    const userReportingID = userReporting.uid;

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

      this.expanded.emit(this.profile.uid);
    }

    setTimeout(() => {
      this.sizeSwipers();

      try {
        this.intSlides.update(); //Fixes broken swiper mechanism that ruins IonSlides snap-swiping
      } catch (TypeError) {
        console.error("No interest slides found."); //No interests selected on profile
      }
    }, 100);
  }

  updatePager(newIndex: number, bulletsRef: QueryList<ElementRef>) {
    // finding all refs within the "bulletsRef" array that has "pagerActive" as id
    const activeRefs = bulletsRef.filter((ref) => ref.nativeElement.id === "pagerActive");

    // removing all currently active bullets
    activeRefs.forEach((ref) => this.renderer.removeAttribute(ref.nativeElement, "id"));

    const newActiveRef = Array.from(bulletsRef)?.[newIndex];

    if (newActiveRef)
      // all we need is for that "setAttribute" to occur after the "removeAttribute" so that
      // the attribute that is removed isn't the one that just got added (this is what was happening
      // before)
      setTimeout(
        () => this.renderer.setAttribute(newActiveRef.nativeElement, "id", "pagerActive"),
        1
      );
  }

  sizeSwipers() {
    const h = this.content.nativeElement.getBoundingClientRect().height;

    this.renderer.setStyle(this.yesSwipe.nativeElement, "height", `${h}px`);
    this.renderer.setStyle(this.noSwipe.nativeElement, "height", `${h}px`);
    this.renderer.setStyle(this.yesSwipe.nativeElement, "marginTop", "13vh");
    this.renderer.setStyle(this.noSwipe.nativeElement, "marginTop", "13vh");
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

  async getSlidesIndex() {
    return firstValueFrom(this.picSlides$.pipe(map((ref) => ref.swiperRef.activeIndex)));
  }

  async getSlidesLength() {
    return firstValueFrom(
      this.picSlides$.pipe(map((ref) => ref.swiperRef.slides.length))
    );
  }

  findInterestIcon(interest: string) {
    interest = interest.toLowerCase();
    interest = interest.replace(/\s/g, ""); //remove spaces

    return `/assets/interests/${interest}.svg`;
  }

  async swiperRemoveListeners() {
    return (await firstValueFrom(this.picSlides$)).swiperRef.detachEvents();
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
    // this.swiperRemoveListeners();
  }
}
