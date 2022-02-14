import { NavController, IonContent, IonSlides, IonSearchbar } from "@ionic/angular";
import {
  Component,
  AfterViewInit,
  OnDestroy,
  OnInit,
  ViewChild,
  ElementRef,
  AfterContentInit,
} from "@angular/core";

import { ActivatedRoute } from "@angular/router";

import {
  BehaviorSubject,
  combineLatest,
  firstValueFrom,
  forkJoin,
  lastValueFrom,
  of,
  ReplaySubject,
  Subscription,
} from "rxjs";
import {
  delay,
  distinctUntilChanged,
  exhaustMap,
  filter,
  first,
  map,
  startWith,
  switchMap,
  switchMapTo,
  take,
} from "rxjs/operators";
import { isEqual } from "lodash";

import { ReportUserComponent } from "../report-user/report-user.component";
import { ProfileCardComponent } from "@components/index";

import { ChatboardStore, CurrentUserStore } from "@stores/index";
import { OtherProfilesStore } from "@stores/other-profiles/other-profiles-store.service";
import { ChatboardPicturesStore } from "@stores/pictures/chatboard-pictures/chatboard-pictures.service";
import { UserReportingService } from "@services/user-reporting/user-reporting.service";

import { Message } from "@classes/index";
import { messengerMotivationMessages } from "@interfaces/index";

import { GlobalErrorHandler } from "@services/errors/global-error-handler.service";
import { Logger } from "src/app/shared/functions/custom-rxjs";
import { MessagesService } from "./messages.service";
import { MessagesResolver } from "./messages.resolver";
import { AnalyticsService } from "@services/analytics/analytics.service";
import { wait } from "src/app/shared/functions/common";

@Component({
  selector: "app-messenger",
  templateUrl: "./messenger.page.html",
  styleUrls: ["./messenger.page.scss"],
  providers: [
    {
      provide: MessagesService,
      // useFactory: (messageResolver: MessagesResolver) => messageResolver.msgService,
      useClass: MessagesService,
      // deps: [MessagesResolver],
    },
  ],
})
export class MessengerPage implements OnInit, AfterViewInit, OnDestroy, AfterContentInit {
  // Constants
  private SCROLL_SPEED: number = 100;

  private subs = new Subscription();

  userInput: string; // Storing latest chat input functionality
  chosenPopup = this.randomMotivationMessage; //Will be randomly chosen from the list above onInit

  messages$ = this.msgService.messages$;
  chat$ = this.msgService.chat$;
  sendingMessage$ = this.msgService.sendingMessage$;

  user;

  private ionContentRef$ = new ReplaySubject<IonContent>(1);
  @ViewChild(IonContent) set ionContentRefSetter(ref: IonContent) {
    if (ref) this.ionContentRef$.next(ref);
  }

  private slidesRef$ = new ReplaySubject<IonSlides>(1);
  @ViewChild("slides") set slidesRefSetter(ref: IonSlides) {
    if (ref) this.slidesRef$.next(ref);
  }

  private profCardRef$ = new ReplaySubject<ProfileCardComponent>(1);
  @ViewChild("profCard") set profCardRefSetter(ref: ProfileCardComponent) {
    if (ref) this.profCardRef$.next(ref);
  }

  private searchBarRef$ = new ReplaySubject<IonSearchbar>(1);
  @ViewChild("searchBar") set searchBarRefSetter(ref: IonSearchbar) {
    if (ref) this.searchBarRef$.next(ref);
  }

  private loadingTriggerRef$ = new ReplaySubject<ElementRef<HTMLElement>>(1);
  @ViewChild("loadingTrigger") set loadingTriggerSetter(ref: ElementRef<HTMLElement>) {
    if (ref) this.loadingTriggerRef$.next(ref);
  }

  private pageIsReady = new BehaviorSubject<boolean>(false);
  // private hasFullyScrolledUp = new Subject<"">();

  pageIsReady$ = this.pageIsReady.asObservable().pipe(distinctUntilChanged());

  // private hasFullyScrolledUp$ = this.hasFullyScrolledUp.asObservable();

  // observable for the other person's profile picture in the bubble
  bubblePicture$ = this.chatboardPictures.holder$.pipe(
    filter((holder) => !!holder),
    switchMap((holder) =>
      combineLatest([of(holder), this.chat$.pipe(filter((chat) => !!chat))])
    ),
    map(([pictureHolder, chat]) => pictureHolder?.[chat?.recipient?.uid]),
    startWith(
      "https://gravatar.com/avatar/dba6bae8c566f9d4041fb9cd9ada7741?d=identicon&f=y"
    )
  );

  // profile of the person we're chatting with
  recipientProfile$ = this.profilesStore.profiles$.pipe(
    switchMap((p) => combineLatest([of(p), this.chat$.pipe(filter((c) => !!c))])),
    map(([profiles, chat]) => profiles?.[chat?.recipient?.uid])
  );

  recipientProfileUrls$ = this.recipientProfile$.pipe(
    map((profile) => profile?.pictureUrls ?? [])
  );

  /** Handles scrolling to bottom of messenger when there a new message is sent (on either side).
   */
  private scrollHandler$ = this.messages$.pipe(
    filter((messages) => messages.length > 0),
    distinctUntilChanged((oldMessages, newMessages) =>
      isEqual(this.getMostRecent(oldMessages), this.getMostRecent(newMessages))
    ),
    delay(300),
    exhaustMap(() => this.scrollToBottom())
  );

  // handles storing the profile of the other user in the chat after it has been loaded
  // this is solely for optimization purposes (only loading each profile once)
  private otherProfileHandler$ = this.chat$.pipe(
    filter((chat) => !!chat),
    map((chat) => chat.recipient.uid),
    switchMap((recipientUID) => this.profilesStore.checkAndSave(recipientUID)),
    switchMap(({ uid, pictures }) => {
      return this.chatboardPictures.addToHolder({ uids: [uid], urls: [pictures[0]] });
      return forkJoin([
        this.chatboardPictures.storeInLocal(uid, pictures[0], true),
        this.chatboardPictures.addToHolder({ uids: [uid], urls: [pictures[0]] }),
      ]);
    })
  );

  async onSendMessage() {
    if (!this.userInput) return; // prevents user from sending empty messages

    const chat = await firstValueFrom(this.chat$.pipe(filter((u) => !!u)));

    const msgTime = await firstValueFrom(this.msgService.sendMessage(this.userInput));

    this.userInput = "";

    const waitOnMessageSent$ = this.msgService.messages$.pipe(
      filter((msgs) => !!msgs.find((msg) => msg.time.getTime() === msgTime.getTime())),
      first()
    );

    await firstValueFrom(waitOnMessageSent$);

    return this.scrollToBottom();
  }

  get randomMotivationMessage() {
    return messengerMotivationMessages[
      Math.floor(Math.random() * messengerMotivationMessages.length)
    ];
  }

  constructor(
    private route: ActivatedRoute,
    private navCtrl: NavController,

    private chatboardStore: ChatboardStore,
    private profilesStore: OtherProfilesStore,
    private chatboardPictures: ChatboardPicturesStore,
    private currentUser: CurrentUserStore,
    private msgService: MessagesService,

    private errorHandler: GlobalErrorHandler,
    private userReporting: UserReportingService,
    private fbAnalytics: AnalyticsService
  ) {}

  ngOnInit() {
    this.subs.add(this.scrollHandler$.subscribe()); //dev
    this.subs.add(this.otherProfileHandler$.subscribe());

    this.user = this.errorHandler.getCurrentUser();
  }

  ngAfterContentInit() {
    console.log("ngAfterContentInit");
  }

  ngAfterViewInit() {
    console.log("ngAfterViewInit");

    this.pageInitialization();

    // this.subs.add(this.moreMessagesLoadingHandler$.subscribe());
    this.styleMessageBar();
    firstValueFrom(this.slidesRef$).then((ref) => ref.lockSwipes(true));
  }

  // initializes the page
  async pageInitialization() {
    // await wait(1000);
    console.log("NOW");
    await this.scrollToBottom(0);

    this.refreshUserInput();

    setTimeout(() => this.pageIsReady.next(true), 500);
  }

  async refreshUserInput() {
    const chat = await firstValueFrom(this.chat$);
    if (!chat) return;

    this.userInput = chat.latestChatInput;
  }

  // opens the modal to report a user
  async openUserReportModal() {
    let userReportedID: string;
    let userReportedName: string;
    let userReportingID: string;
    let userReportedPicture: string;

    await lastValueFrom(
      this.recipientProfile$.pipe(
        take(1),
        map((profile) => {
          userReportedID = profile.uid;
          userReportedName = profile.firstName;
          userReportedPicture = profile.pictureUrls[0];
        })
      )
    );

    const user = await this.errorHandler.getCurrentUser();
    userReportingID = user.uid;

    if (!userReportedID || !userReportingID || !userReportedName) return;

    await this.userReporting.displayReportModal(
      ReportUserComponent,
      userReportingID,
      userReportedID,
      userReportedName,
      userReportedPicture
    );
  }

  async styleMessageBar() {
    //Add styles to the message bar (it is inaccessible in shadowDOM)
    let el = await (await firstValueFrom(this.searchBarRef$)).getInputElement();
    let styles = {
      border: "solid 1px var(--ion-color-light-tint)",
      borderRadius: "25px",
      paddingInlineStart: "10px",
      paddingInlineEnd: "35px",
      fontSize: "2.4vh",
    };

    Object.keys(styles).forEach((key) => {
      el.style[key] = styles[key];
    });
  }

  // returns the most recent message of an array of messages
  getMostRecent(messages: Message[]): Message {
    return messages.reduce((msg1, msg2) =>
      msg1.time.getTime() > msg2.time.getTime() ? msg1 : msg2
    );
  }

  // used to slide between the other user's profile and the messages panels
  async slideTo(page) {
    const slidesRef = await firstValueFrom(this.slidesRef$);
    slidesRef.lockSwipes(false);

    if (page === "profile") {
      const profCardRef = await firstValueFrom(this.profCardRef$);
      (await firstValueFrom(profCardRef.picSlides$)).swiperRef.slideTo(0);
      // profCardRef.updatePager(0);
      await slidesRef.slideNext();
    } else if (page === "messenger") {
      slidesRef.slidePrev();
    }

    slidesRef.lockSwipes(true);
  }

  async scrollToBottom(scrollSpeed: number = this.SCROLL_SPEED) {
    return firstValueFrom(this.ionContentRef$).then((ref) =>
      ref.scrollToBottom(scrollSpeed)
    );
  }

  async instantScroll(scrollTop: number) {
    return firstValueFrom(this.ionContentRef$).then((ref) =>
      ref.scrollToPoint(0, scrollTop, 0)
    );
  }

  backToChatboard(): void {
    this.navCtrl.navigateBack("/main/tabs/chats");
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }
}
