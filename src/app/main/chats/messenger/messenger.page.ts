import {
  Component,
  AfterViewInit,
  OnDestroy,
  OnInit,
  ViewChild,
  ElementRef,
} from "@angular/core";

import { NavController, IonContent, IonSlides, IonSearchbar } from "@ionic/angular";
import { AngularFireAuth } from "@angular/fire/compat/auth";
import { ActivatedRoute, ParamMap, Router } from "@angular/router";

import { ReportUserComponent } from "../report-user/report-user.component";

import { BehaviorSubject, forkJoin, from, Observable, of, Subscription } from "rxjs";
import {
  delay,
  distinct,
  filter,
  first,
  map,
  switchMap,
  take,
  tap,
  withLatestFrom,
} from "rxjs/operators";

import { Chat, Message, Profile } from "@classes/index";
import { ChatboardStore, CurrentUserStore } from "@stores/index";
import { ProfileCardComponent } from "@components/index";
import { OtherProfilesStore } from "@stores/other-profiles/other-profiles-store.service";
import { ChatboardPicturesStore } from "@stores/pictures/chatboard-pictures/chatboard-pictures.service";
import { QuerySnapshot, Timestamp } from "@angular/fire/firestore";
import { messageFromDatabase } from "@interfaces/message.model";
import { FormatService } from "@services/format/format.service";

import { SafeUrl } from "@angular/platform-browser";
import { UserReportingService } from "@services/user-reporting/user-reporting.service";
import { AngularFirestore } from "@angular/fire/compat/firestore";

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
  @ViewChild(IonContent) ionContent: IonContent;
  @ViewChild("slides") slides: IonSlides;
  @ViewChild("profSlide", { read: ElementRef }) profSlide: ElementRef;
  @ViewChild("header", { read: ElementRef }) header: ElementRef;

  // profCard: ElementRef;
  // @ViewChildren("profCard", { read: ElementRef }) profCardView: QueryList<ElementRef>;
  @ViewChild("profCard", { read: ElementRef, static: false }) profCard: ElementRef;
  //  profCard: ElementRef; //for styling
  @ViewChild("profCard") grandchildren: ProfileCardComponent; //for access to grandchildren
  @ViewChild('searchBar') searchBar: IonSearchbar;

  profilesSub: Subscription;
  profileHandlingSub: Subscription;

  bubblePicture$: Observable<SafeUrl>;

  chatProfiles: Profile[];
  recipientProfile$: Observable<Profile>;

  messages$ = new BehaviorSubject<Message[]>([]);
  messagesDatabaseSub: () => void = null;

  // Constants
  private SCROLL_SPEED: number = 100;
  private chatID: string;
  private MSG_BATCH_SIZE: number = 20;

  // Storing latest chat input functionality
  public latestChatInput: string;

  // Scroll functionality
  private scrollSub: Subscription;
  private timeOfNewestMsg: Date;

  public thisChat$ = new BehaviorSubject<Chat>(null);

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
    private router: Router
  ) {}

  ngOnInit() {
    this.route.paramMap
      .pipe(
        first(),
        switchMap((param) => {
          console.log("param Map", param);
          return this.initialiseMessenger(param);
        })
      )
      .subscribe();

    this.timeOfNewestMsg = this.lastInteracted();
    this.scrollSub = this.scrollHandler().subscribe();

    this.bubblePicture$ = this.chatboardPictures.holder$.pipe(
      withLatestFrom(this.thisChat$),
      map(([pictureHolder, chat]) => pictureHolder?.[chat?.recipient?.uid])
    );

    // this logic is for updating the locally stored chatboard picture whenever that person's
    // profile is loaded. It is how we update this locally stored picture.
    this.profileHandlingSub = this.thisChat$
      .pipe(
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
      )
      .subscribe();

    this.recipientProfile$ = this.profilesStore.profiles$.pipe(
      withLatestFrom(this.thisChat$),
      map(([profiles, chat]) => profiles?.[chat?.recipient?.uid])
    );

    this.recipientProfile$.subscribe((a) => console.log("recipient profile", a));
  }

  async ngAfterViewInit() {
    //Add styles to the message bar (it is inaccessible in shadowDOM)
    let el = await this.searchBar.getInputElement();
    let styles = {
      border: 'solid 1px var(--ion-color-light-shade)',
      borderRadius: '25px',
      paddingInlineStart: '10px',
      paddingInlineEnd: '35px'
    };
    
    Object.keys(styles).forEach(key => {
      el.style[key] = styles[key];
    });

    this.slides.lockSwipes(true);
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
  private initialiseMessenger(parameter: ParamMap): Observable<any> {
    if (!parameter.has("chatID")) return from(this.navCtrl.navigateBack("/tabs/chats"));

    this.chatID = parameter.get("chatID");

    return this.chatboardStore.chats$.pipe(
      filter((chats) => !!chats?.[this.chatID]),
      withLatestFrom(this.currentUser.user$.pipe(filter((u) => !!u))),
      take(1),
      map(([chats, user]) => {
        // Fills the chat subject with the data from the chatboard store
        this.thisChat$.next(chats[this.chatID]);
        this.latestChatInput = chats[this.chatID].latestChatInput;
        console.log("user is ", user);
        return user.uid;
      }),
      map((uid) => {
        // Activates the listener for this chat's messages and fills the messages subject
        // when something changes in the messages collection
        this.firestore.firestore
          .collection("chats")
          .doc(this.chatID)
          .collection("messages")
          .where("uids", "array-contains", uid)
          .orderBy("time", "desc")
          .limit(this.MSG_BATCH_SIZE)
          .onSnapshot({
            next: (snapshot) => {
              this.messages$.next(
                this.format.messagesDatabaseToClass(
                  snapshot.docs.map((d) => d.data()).reverse() as messageFromDatabase[]
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
      tap((a) => console.log("auth$", a)),
      withLatestFrom(this.thisChat$.pipe(filter((c) => !!c))),
      take(1),
      filter(() => !!this.latestChatInput), // prevents user from sending empty messages
      switchMap(([user, thisChat]) => {
        console.log("a");
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
            .doc(this.chatID)
            .collection("messages")
            .doc()
            .set(message)
        );
      }),
      switchMap(() =>
        this.messages$.pipe(
          tap(() => console.log("b")),
          filter(
            (msgs) => !!msgs.find((msg) => msg.time.getTime() === messageTime.getTime()) // filters out
          ),
          take(1),
          map(() => this.ionContent.scrollToBottom(this.SCROLL_SPEED))
        )
      )
    );
  }

  /** Updates Chats object of chatStore,
   * subsequently updates chat on database */
  // async senddMessage(): Promise<void> {
  //   const messageContent: string = this.latestChatInput;

  //   if (!messageContent) return;

  //   const chat: Chat = this.thisChat$.getValue();
  //   if (!chat) return console.error("Chat object is empty");

  //   const user = await this.afauth.currentUser;
  //   if (!user) return console.error("User isn't logged in.");

  //   const time: Date = new Date();

  //   const newMessage: Message = new Message(user.uid, time, messageContent, null);

  //   this.latestChatInput = "";
  //   this.chatStore.localMessageAddition(newMessage, chat);
  //   this.chatStore.updateLastInteracted(chat, time);

  //   try {
  //     await this.chatStore.databaseUpdateMessages(chat);
  //     this.chatStore.updateMessageState(chat, newMessage, "sent");
  //   } catch (e) {
  //     console.error(`Message to ${chat.recipient.name} failed to send: ${e}`);
  //     this.chatStore.updateMessageState(chat, newMessage, "failed");
  //   }
  // }

  /** Makes an attempt to change db version of chat's messages from local version */
  // async retryUpdateMessage(message: Message) {
  //   if (!message || message.state !== "failed") return;

  //   const chat: Chat = this.thisChat$.getValue();
  //   if (!chat) return console.error("Chat object is empty");

  //   try {
  //     await this.chatStore.databaseUpdateMessages(chat);
  //     this.chatStore.updateMessageState(chat, message, "sent");
  //   } catch (e) {
  //     console.error(`Message to ${chat.recipient.name} failed to send: ${e}`);
  //   }
  // }

  /** Handles scrolling to bottom of messenger when there a new message is sent (on either side).
   * We assume a change in the time of the newest message means a new message appeared.
   */
  private scrollHandler() {
    return this.messages$.pipe(
      filter((messages) => messages.length > 0),
      distinct((messages) => this.getMostRecent(messages)),
      delay(300),
      map(() => this.ionContent.scrollToBottom(this.SCROLL_SPEED))
    );
    // if (!chat?.recentMessage) return;

    if (this.lastInteracted() > this.timeOfNewestMsg) {
      this.timeOfNewestMsg = this.lastInteracted();
      setTimeout(() => this.ionContent.scrollToBottom(this.SCROLL_SPEED), 100);
    }
  }

  /** Called in html, teleports to bottom of page when content is rendered */
  fastScroll() {
    this.ionContent?.scrollToBottom(0);
  }

  /** Returns the time of the newest message */
  private lastInteracted(): Date {
    const chat = this.thisChat$.getValue();
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
    const chat: Chat = this.thisChat$.getValue();
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
    this.profileHandlingSub?.unsubscribe();
    this.scrollSub?.unsubscribe();
    this.messagesDatabaseSub ? this.messagesDatabaseSub() : null;
  }
}
