import {
  Component,
  AfterViewInit,
  OnDestroy,
  OnInit,
  ViewChild,
  ElementRef,
  ChangeDetectorRef,
} from "@angular/core";

import {
  NavController,
  IonContent,
  IonSlides,
  IonSearchbar,
  LoadingController,
} from "@ionic/angular";
import { AngularFireAuth } from "@angular/fire/compat/auth";
import { ActivatedRoute, ParamMap, Router } from "@angular/router";

import { ReportUserComponent } from "../report-user/report-user.component";

import {
  BehaviorSubject,
  concat,
  forkJoin,
  from,
  Observable,
  of,
  Subject,
  Subscription,
  timer,
} from "rxjs";
import {
  concatMap,
  delay,
  distinct,
  distinctUntilChanged,
  exhaustMap,
  filter,
  first,
  map,
  share,
  shareReplay,
  startWith,
  switchMap,
  take,
  tap,
  withLatestFrom,
} from "rxjs/operators";

import { AppUser, Chat, Message, Profile } from "@classes/index";
import { ChatboardStore, CurrentUserStore } from "@stores/index";
import { ProfileCardComponent } from "@components/index";
import { OtherProfilesStore } from "@stores/other-profiles/other-profiles-store.service";
import { ChatboardPicturesStore } from "@stores/pictures/chatboard-pictures/chatboard-pictures.service";
import { Timestamp } from "@angular/fire/firestore";
import { messageFromDatabase, messageMap } from "@interfaces/message.model";
import { FormatService } from "@services/format/format.service";

import { SafeUrl } from "@angular/platform-browser";
import { UserReportingService } from "@services/user-reporting/user-reporting.service";
import { AngularFirestore } from "@angular/fire/compat/firestore";
import { isEqual } from "lodash";

function sortUIDs(uids: string[]): string[] {
  return uids.sort((a, b) => ("" + a).localeCompare(b));
}

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

  @ViewChild("messageContainer", { read: ElementRef }) messageContainer: ElementRef;
  @ViewChild(IonContent) ionContent: IonContent;
  @ViewChild("slides") slides: IonSlides;
  @ViewChild("profSlide", { read: ElementRef }) profSlide: ElementRef;
  @ViewChild("header", { read: ElementRef }) header: ElementRef;
  @ViewChild("profCard", { read: ElementRef, static: false }) profCard: ElementRef;
  @ViewChild("profCard") grandchildren: ProfileCardComponent; //for access to grandchildren
  @ViewChild("searchBar") searchBar: IonSearchbar;
  @ViewChild("loadingTrigger") loadingTrigger: ElementRef<HTMLElement>;

  private subs = new Subscription();
  private messagesDatabaseSub: () => void = null;

  private loadingObserver: IntersectionObserver;

  public latestChatInput: string; // Storing latest chat input functionality

  private hasFullyScrolled = new Subject<"">();
  private hasFullyScrolled$ = this.hasFullyScrolled.asObservable();

  public messages$ = new BehaviorSubject<Message[]>([]);
  public chat$ = new BehaviorSubject<Chat>(null);

  private pageIsReady = new BehaviorSubject<boolean>(false);
  public pageIsReady$ = this.pageIsReady.asObservable().pipe(distinctUntilChanged());

  get firstBatchArrived$() {
    return this.messages$.pipe(
      map((msgs) => msgs.length > 1),
      distinctUntilChanged(),
      delay(400),
      shareReplay()
    );
  }

  get bubblePicture$(): Observable<SafeUrl> {
    return this.chatboardPictures.holder$.pipe(
      withLatestFrom(this.chat$),
      map(([pictureHolder, chat]) => pictureHolder?.[chat?.recipient?.uid])
    );
  }

  get recipientProfile$(): Observable<Profile> {
    return this.profilesStore.profiles$.pipe(
      withLatestFrom(this.chat$),
      map(([profiles, chat]) => profiles?.[chat?.recipient?.uid])
    );
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
    private router: Router,
    private host: ElementRef,
    private loadingCtrl: LoadingController,
    private changeDetectionRef: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.pageIsReady$.subscribe((a) => console.log("page is ready: " + a));
    this.firstBatchArrived$.subscribe((a) => console.log("first batch arrived " + a));
    this.pageInitialization();
    this.subs.add(this.scrollHandler$.subscribe());
    this.subs.add(this.otherProfileHandler$.subscribe());
  }

  ngAfterViewInit() {
    this.subs.add(this.moreMessagesLoadingHandler$.subscribe());
    this.styleMessageBar();
    this.slides.lockSwipes(true);
  }

  async pageInitialization() {
    console.log("a");
    const paramMap = await this.route.paramMap.pipe(first()).toPromise();
    console.log("b");

    if (!paramMap.has("chatID")) {
      return this.navCtrl.navigateBack("/tabs/chats");
    }

    this.CHAT_ID = paramMap.get("chatID");

    await this.initializeMessenger().toPromise();
    console.log("c");
    await this.ionContent.scrollToBottom();
    console.log("d");

    setTimeout(() => this.pageIsReady.next(true), 500);
  }

  /** Handles scrolling to bottom of messenger when there a new message is sent (on either side).
   * We assume a change in the time of the newest message means a new message appeared.
   */
  private get scrollHandler$() {
    return this.messages$.pipe(
      filter((messages) => messages.length > 0),
      distinctUntilChanged((oldMessages, newMessages) =>
        isEqual(this.getMostRecent(oldMessages), this.getMostRecent(newMessages))
      ),
      delay(300),
      exhaustMap(() => this.ionContent.scrollToBottom(this.SCROLL_SPEED))
    );
  }

  get otherProfileHandler$() {
    return this.chat$.pipe(
      filter((chat) => !!chat),
      map((chat) => chat.recipient.uid),
      switchMap((recipientUID) => this.profilesStore.checkAndSave(recipientUID)),
      switchMap(({ uid, pictures }) => {
        return of();
        return forkJoin([
          this.chatboardPictures.storeInLocal(uid, pictures[0], true),
          this.chatboardPictures.addToHolder({ uids: [uid], urls: [pictures[0]] }),
        ]);
      })
    );
  }

  get moreMessagesLoadingHandler$() {
    this.loadingObserver?.disconnect();

    this.loadingObserver = new IntersectionObserver(
      ([entry]) => {
        entry.isIntersecting && this.hasFullyScrolled.next("");
      },
      { root: this.host.nativeElement }
    );

    this.loadingObserver.observe(this.loadingTrigger.nativeElement);

    return this.hasFullyScrolled$.pipe(
      withLatestFrom(this.firstBatchArrived$),
      tap(() => console.log("asdasd")),
      exhaustMap(() => concat(timer(500), this.listenOnMoreMessages()))
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
    };

    Object.keys(styles).forEach((key) => {
      el.style[key] = styles[key];
    });
  }

  trackMessage(index: number, message: Message) {
    return message.messageID;
  }

  async openUserReportModal() {
    let userReportedID: string;
    let userReportedName: string;
    let userReportingID: string;

    const getReportedInfo = this.recipientProfile$
      .pipe(
        take(1),
        map((profile) => {
          userReportedID = profile.uid;
          userReportedName = profile.firstName;
        })
      )
      .toPromise();

    const getReportingInfo = this.afAuth.user
      .pipe(
        filter((user) => !!user),
        take(1),
        map((user) => (userReportingID = user.uid))
      )
      .toPromise();

    await Promise.all([getReportedInfo, getReportingInfo]);

    if (!userReportedID || !userReportingID || !userReportedName) return;

    await this.userReporting.displayReportModal(
      ReportUserComponent,
      userReportingID,
      userReportedID,
      userReportedName
    );
  }

  /** Subscribes to chatStore's Chats osbervable using chatID
   * from paramMap */
  private initializeMessenger(): Observable<any> {
    return this.chatboardStore.chats$.pipe(
      filter((chats) => !!chats?.[this.CHAT_ID]),
      tap((a) => console.log("the chat right now is" + a)),
      withLatestFrom(this.currentUser.user$.pipe(filter((u) => !!u))),
      take(1),
      map(([chats, user]) => {
        console.log("we got here ");
        // Fills the chat subject with the data from the chatboard store
        this.chat$.next(chats[this.CHAT_ID]);
        this.latestChatInput = chats[this.CHAT_ID].latestChatInput;
        return user.uid;
      }),
      concatMap(() => this.listenOnMoreMessages())
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

        console.log("listening on more messages", msgCount);

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

  sendMessage(): Observable<any> {
    const messageTime = new Date();
    console.log(this.latestChatInput);

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

  /** Returns the time of the newest message */
  private lastInteracted(): Date {
    const chat = this.chat$.getValue();
    if (!chat) return;
    return new Date(Math.max.apply(null, chat.recentMessage.time));
  }

  getMostRecent(messages: Message[]): Message {
    return messages.reduce((msg1, msg2) =>
      msg1.time.getTime() > msg2.time.getTime() ? msg1 : msg2
    );
  }

  hasFailed(message: Message): boolean {
    if (!message) return;
    if (message.state === "failed") return true;
    if (message.state === "sent" || message.state === "sending") return false;
    console.error("unknow message state");
    return;
  }

  isSending(message: Message): boolean {
    if (!message) return;
    if (message.state === "sending") return true;
    if (message.state === "sent" || message.state === "failed") return false;
    console.error("unknow message state");
    return;
  }

  isOwnMessage(message: Message): boolean {
    if (!message) return;
    const chat: Chat = this.chat$.getValue();
    if (message.senderID === chat.recipient.uid) return false;
    return true;
  }

  async slideTo(page) {
    this.slides.lockSwipes(false);

    if (page === "profile") {
      this.slides.slideNext();
    } else if (page === "messenger") {
      this.slides.slidePrev();
    }

    this.slides.lockSwipes(true);
  }

  backToChatboard(): void {
    this.router.navigateByUrl("/main/tabs/chats");
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
    this.loadingObserver?.disconnect();
    this.messagesDatabaseSub?.();
  }
}
