import { NavController, IonSlides, IonSearchbar } from "@ionic/angular";
import {
  Component,
  AfterViewInit,
  OnDestroy,
  OnInit,
  ViewChild,
  ElementRef,
  AfterContentInit,
} from "@angular/core";

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
  distinctUntilChanged,
  filter,
  map,
  startWith,
  switchMap,
  take,
} from "rxjs/operators";

import { ReportUserComponent } from "../report-user/report-user.component";
import { ProfileCardComponent } from "@components/index";

import { ChatboardStore } from "@stores/index";
import { OtherProfilesStore } from "@stores/other-profiles/other-profiles-store.service";
import { ChatboardPicturesStore } from "@stores/pictures/chatboard-pictures/chatboard-pictures.service";
import { UserReportingService } from "@services/user-reporting/user-reporting.service";

import { messengerMotivationMessages } from "@interfaces/index";

import { GlobalErrorHandler } from "@services/errors/global-error-handler.service";
import { SubscribeAndLog } from "src/app/shared/functions/custom-rxjs";
import { MessagesService } from "./messages.service";

import { wait } from "src/app/shared/functions/common";
import { MsgScrollingHandlerService } from "./msg-scrolling-handler.service";

@Component({
  selector: "app-messenger",
  templateUrl: "./messenger.page.html",
  styleUrls: ["./messenger.page.scss"],
  providers: [MessagesService, MsgScrollingHandlerService],
})
export class MessengerPage implements OnInit, AfterViewInit, OnDestroy, AfterContentInit {
  private subs = new Subscription();

  userInput: string; // Storing latest chat input functionality
  chosenPopup = this.randomMotivationMessage; //Will be randomly chosen from the list above onInit

  messages$ = this.msgService.messages$;
  chat$ = this.msgService.chat$;
  sendingMessage$ = this.msgService.sendingMessage$;

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
  pageIsReady$ = this.pageIsReady.asObservable().pipe(distinctUntilChanged());

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

    try {
      const msgTime = await firstValueFrom(this.msgService.sendMessage(this.userInput));

      this.userInput = "";

      const waitOnMessageSent$ = this.msgService.messages$.pipe(
        filter((msgs) => !!msgs.find((msg) => msg.time.getTime() === msgTime.getTime())),
        take(1)
      );

      await firstValueFrom(waitOnMessageSent$);
      await wait(50);

      return this.msgScrollingHandler.scrollToBottom();
    } catch {}
  }

  get randomMotivationMessage() {
    return messengerMotivationMessages[
      Math.floor(Math.random() * messengerMotivationMessages.length)
    ];
  }

  constructor(
    private navCtrl: NavController,

    private profilesStore: OtherProfilesStore,
    private chatboardPictures: ChatboardPicturesStore,
    private chatboardStore: ChatboardStore,
    private msgService: MessagesService,
    private msgScrollingHandler: MsgScrollingHandlerService,

    private errorHandler: GlobalErrorHandler,
    private userReporting: UserReportingService
  ) {}

  ngOnInit() {
    SubscribeAndLog(this.sendingMessage$, "sendingMessage$");
    this.subs.add(this.otherProfileHandler$.subscribe());
  }

  ngAfterContentInit() {
    console.log("ngAfterContentInit");
    this.pageInitialization();
  }

  ngAfterViewInit() {
    console.log("ngAfterViewInit");

    this.styleMessageBar();
    firstValueFrom(this.slidesRef$).then((ref) => ref.lockSwipes(true));
  }

  // initializes the page
  async pageInitialization() {
    console.log("NOW");

    this.refreshUserInput();

    setTimeout(() => this.pageIsReady.next(true), 500);
  }

  async refreshUserInput() {
    const chat = await firstValueFrom(this.chat$);
    console.log("chat", chat);
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

  async saveChatInput() {
    if (!this.userInput) return;
    const chatid = (await firstValueFrom(this.chat$)).id;
    if (!chatid) return;

    return firstValueFrom(this.chatboardStore.saveChatInput(chatid, this.userInput));
  }

  async backToChatboard() {
    this.saveChatInput(); // not awaited on purpose

    return this.navCtrl.navigateBack("/main/tabs/chats");
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }
}
