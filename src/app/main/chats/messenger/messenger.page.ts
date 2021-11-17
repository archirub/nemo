import { NavController, IonContent, IonSlides, IonSearchbar } from "@ionic/angular";
import {
  Component,
  AfterViewInit,
  OnDestroy,
  OnInit,
  ViewChild,
  ElementRef,
} from "@angular/core";

import { AngularFirestore } from "@angular/fire/firestore";
import { AngularFireAuth } from "@angular/fire/auth";
import { ActivatedRoute } from "@angular/router";

import {
  BehaviorSubject,
  concat,
  forkJoin,
  from,
  lastValueFrom,
  Observable,
  of,
  Subject,
  Subscription,
  timer,
} from "rxjs";
import {
  concatMap,
  delay,
  distinctUntilChanged,
  exhaustMap,
  filter,
  first,
  map,
  shareReplay,
  switchMap,
  take,
  tap,
  withLatestFrom,
} from "rxjs/operators";
import { isEqual } from "lodash";

import { ReportUserComponent } from "../report-user/report-user.component";
import { ProfileCardComponent } from "@components/index";

import { ChatboardStore, CurrentUserStore } from "@stores/index";
import { OtherProfilesStore } from "@stores/other-profiles/other-profiles-store.service";
import { ChatboardPicturesStore } from "@stores/pictures/chatboard-pictures/chatboard-pictures.service";
import { FormatService } from "@services/format/format.service";
import { UserReportingService } from "@services/user-reporting/user-reporting.service";

import { AppUser, Chat, Message } from "@classes/index";
import { messageFromDatabase, messageMap } from "@interfaces/message.model";
import { messengerMotivationMessages, sortUIDs, Timestamp } from "@interfaces/index";

@Component({
  selector: "app-messenger",
  templateUrl: "./messenger.page.html",
  styleUrls: ["./messenger.page.scss"],
  providers: [],
})
export class MessengerPage implements OnInit, AfterViewInit, OnDestroy {
  // Constants
  private SCROLL_SPEED: number = 100;
  private CHAT_ID: string;
  private MSG_BATCH_SIZE: number = 20;

  private subs = new Subscription();

  private messagesDatabaseSub: () => void = null;
  private loadingObserver: IntersectionObserver;

  latestChatInput: string; // Storing latest chat input functionality
  chosenPopup = this.randomMotivationMessage; //Will be randomly chosen from the list above onInit

  @ViewChild(IonContent) ionContent: IonContent;
  @ViewChild("slides") slides: IonSlides;
  @ViewChild("profCard") profCard: ProfileCardComponent; //for access to grandchildren
  @ViewChild("searchBar") searchBar: IonSearchbar;
  @ViewChild("loadingTrigger") loadingTrigger: ElementRef<HTMLElement>;

  chat$ = new BehaviorSubject<Chat>(null);
  messages$ = new BehaviorSubject<Message[]>([]);

  private pageIsReady = new BehaviorSubject<boolean>(false);
  pageIsReady$ = this.pageIsReady.asObservable().pipe(distinctUntilChanged());

  private hasFullyScrolled = new Subject<"">();
  private hasFullyScrolled$ = this.hasFullyScrolled.asObservable();

  // emits once the first batch of messages has arrived.
  // this is for the moreMessagesLoadingHandler
  firstBatchArrived$ = this.messages$.pipe(
    map((msgs) => msgs.length > 1),
    distinctUntilChanged(),
    delay(400),
    shareReplay()
  );

  // observable for the other person's profile picture in the bubble
  bubblePicture$ = this.chatboardPictures.holder$.pipe(
    withLatestFrom(this.chat$),
    map(([pictureHolder, chat]) => pictureHolder?.[chat?.recipient?.uid])
  );

  // profile of the person we're chatting with
  recipientProfile$ = this.profilesStore.profiles$.pipe(
    withLatestFrom(this.chat$),
    map(([profiles, chat]) => profiles?.[chat?.recipient?.uid])
  );

  /** Handles scrolling to bottom of messenger when there a new message is sent (on either side).
   * We assume a change in the time of the newest message means a new message appeared.
   */
  private scrollHandler$ = this.messages$.pipe(
    filter((messages) => messages.length > 0),
    distinctUntilChanged((oldMessages, newMessages) =>
      isEqual(this.getMostRecent(oldMessages), this.getMostRecent(newMessages))
    ),
    delay(300),
    exhaustMap(() => this.ionContent.scrollToBottom(this.SCROLL_SPEED))
  );

  // handles storing the profile of the other user in the chat after it has been loaded
  // this is solely for optimization purposes (only loading each profile once)
  private otherProfileHandler$ = this.chat$.pipe(
    filter((chat) => !!chat),
    map((chat) => chat.recipient.uid),
    switchMap((recipientUID) => this.profilesStore.checkAndSave(recipientUID)),
    switchMap(({ uid, pictures }) => {
      return of("");
      return forkJoin([
        this.chatboardPictures.storeInLocal(uid, pictures[0], true),
        this.chatboardPictures.addToHolder({ uids: [uid], urls: [pictures[0]] }),
      ]);
    })
  );

  // Handles the loading of more messages when the user scrolls all the way to the oldest loaded messages
  get moreMessagesLoadingHandler$() {
    this.loadingObserver?.disconnect();
    console.log("moreMessagesLoadingHandler");

    this.loadingObserver = new IntersectionObserver(
      ([entry]) => {
        entry.isIntersecting && this.hasFullyScrolled.next("");
      },
      { root: this.host.nativeElement }
    );

    this.loadingObserver.observe(this.loadingTrigger.nativeElement);

    return this.hasFullyScrolled$.pipe(
      withLatestFrom(this.firstBatchArrived$), // to make sure we are only loading more messages if the first batch has already arrived
      exhaustMap(() => concat(timer(500), this.listenOnMoreMessages()))
    );
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
    private afauth: AngularFireAuth,
    private firestore: AngularFirestore,
    private profilesStore: OtherProfilesStore,
    private chatboardPictures: ChatboardPicturesStore,
    private format: FormatService,
    private userReporting: UserReportingService,
    private afAuth: AngularFireAuth,
    private currentUser: CurrentUserStore,
    private host: ElementRef
  ) {}

  ngOnInit() {
    this.subs.add(this.scrollHandler$.subscribe());
    this.subs.add(this.otherProfileHandler$.subscribe());
    this.pageInitialization();
  }

  ngAfterViewInit() {
    this.subs.add(this.moreMessagesLoadingHandler$.subscribe());
    this.styleMessageBar();
    this.slides.lockSwipes(true);
  }

  // initialises the page
  async pageInitialization() {
    const paramMap = await lastValueFrom(this.route.paramMap.pipe(first()));

    if (!paramMap.has("chatID")) {
      return this.navCtrl.navigateBack("/tabs/chats");
    }

    this.CHAT_ID = paramMap.get("chatID");

    await lastValueFrom(this.initializeMessenger());
    await this.ionContent.scrollToBottom();

    setTimeout(() => this.pageIsReady.next(true), 500);
  }

  /** Subscribes to chatStore's Chats osbervable using chatID
   * from paramMap */
  private initializeMessenger(): Observable<any> {
    return this.chatboardStore.chats$.pipe(
      filter((chats) => !!chats?.[this.CHAT_ID]),
      withLatestFrom(this.currentUser.user$.pipe(filter((u) => !!u))),
      take(1),
      map(([chats, user]) => {
        // Fills the chat subject with the data from the chatboard store
        this.chat$.next(chats[this.CHAT_ID]);
        this.latestChatInput = chats[this.CHAT_ID].latestChatInput;
        return user.uid;
      }),
      concatMap(() => this.listenOnMoreMessages())
    );
  }

  // opens the modal to report a user
  async openUserReportModal() {
    let userReportedID: string;
    let userReportedName: string;
    let userReportingID: string;
    let userReportedPicture: string;

    const getReportedInfo = lastValueFrom(
      this.recipientProfile$.pipe(
        take(1),
        map((profile) => {
          userReportedID = profile.uid;
          userReportedName = profile.firstName;
          userReportedPicture = profile.pictureUrls[0];
        })
      )
    );

    const getReportingInfo = lastValueFrom(
      this.afAuth.user.pipe(
        filter((user) => !!user),
        take(1),
        map((user) => (userReportingID = user.uid))
      )
    );

    await Promise.all([getReportedInfo, getReportingInfo]);

    if (!userReportedID || !userReportingID || !userReportedName) return;

    await this.userReporting.displayReportModal(
      ReportUserComponent,
      userReportingID,
      userReportedID,
      userReportedName,
      userReportedPicture
    );
  }

  /**
   * Activates the listener for this chat's messages and fills the messages subject
   * when something changes in the messages collection
   */
  listenOnMoreMessages() {
    return this.messages$.pipe(
      withLatestFrom(this.currentUser.user$.pipe(filter((u) => !!u))),
      take(1),
      map(([msgs, user]) => [msgs.length, user] as [number, AppUser]),
      map(([msgCount, user]) => {
        this.messagesDatabaseSub?.();

        const newMsgCount = msgCount + this.MSG_BATCH_SIZE;

        this.messagesDatabaseSub = this.firestore.firestore
          .collection("chats")
          .doc(this.CHAT_ID)
          .collection("messages")
          .where("uids", "array-contains", user.uid)
          .orderBy("time", "desc")
          .limit(newMsgCount)
          .onSnapshot({
            next: (snapshot) => {
              // this is necessary because on updating the batch size,
              // we sometimes only get 1 message at first for some reason,
              // and that makes the messages rerender weirdly in ngFor loop
              if (msgCount >= snapshot.docs.length) return;

              this.messages$.next(
                this.format.messagesDatabaseToClass(
                  snapshot.docs
                    .map((d) => ({ id: d.id, message: d.data() }))
                    .reverse() as messageMap[]
                )
              );
            },
            error: (err) => console.error("error in database message listening", err),
          });
      })
    );
  }

  // Sends the content of the input bar as a new message to the database
  sendMessage(): Observable<any> {
    const messageTime = new Date();

    return this.afauth.user.pipe(
      withLatestFrom(this.chat$.pipe(filter((c) => !!c))),
      take(1),
      filter(() => !!this.latestChatInput), // prevents user from sending empty messages
      switchMap(([user, thisChat]) => {
        if (!user) throw "no user authenticated";

        const message: messageFromDatabase = {
          uids: sortUIDs([thisChat.recipient.uid, user.uid]),
          senderID: user.uid,
          time: Timestamp.fromDate(messageTime),
          content: this.latestChatInput,
        };

        this.latestChatInput = "";

        return from(
          this.firestore.firestore
            .collection("chats")
            .doc(this.CHAT_ID)
            .collection("messages")
            .doc()
            .set(message)
        );
      }),
      switchMap(() =>
        this.messages$.pipe(
          filter(
            (msgs) => !!msgs.find((msg) => msg.time.getTime() === messageTime.getTime()) // filters out
          ),
          take(1),
          map(() => this.ionContent.scrollToBottom(this.SCROLL_SPEED))
        )
      )
    );
  }

  async styleMessageBar() {
    //Add styles to the message bar (it is inaccessible in shadowDOM)
    let el = await this.searchBar.getInputElement();
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
    this.slides.lockSwipes(false);

    if (page === "profile") {
      this.profCard.slides.slideTo(0);
      this.profCard.updatePager(0);
      this.slides.slideNext();
    } else if (page === "messenger") {
      this.slides.slidePrev();
    }

    this.slides.lockSwipes(true);
  }

  backToChatboard(): void {
    this.navCtrl.navigateBack("/main/tabs/chats");
  }

  // for trackBy of ngFor on messages
  trackMessage(index: number, message: Message) {
    return message.messageID;
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
    this.loadingObserver?.disconnect();
    this.messagesDatabaseSub?.();
  }
}
