import {
  Component,
  AfterViewInit,
  OnDestroy,
  OnInit,
  ViewChild,
  ElementRef,
} from "@angular/core";

import { NavController, IonContent, IonSlides } from "@ionic/angular";
import { AngularFireAuth } from "@angular/fire/auth";
import { ActivatedRoute, ParamMap } from "@angular/router";

import { BehaviorSubject, forkJoin, from, Observable, Subscription } from "rxjs";
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
import { ChatboardStore } from "@stores/index";
import { ProfileCardComponent } from "@components/index";
import { OtherProfilesStore } from "@stores/other-profiles-store/other-profiles-store.service";
import { ChatboardPicturesStore } from "@stores/pictures-stores/chatboard-pictures-store/chatboard-pictures.service";
import { AngularFirestore, QuerySnapshot } from "@angular/fire/firestore";
import { messageFromDatabase } from "@interfaces/message.model";
import { FormatService } from "@services/index";

import firebase from "firebase";
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

  profilesSub: Subscription;
  profileHandlingSub: Subscription;

  bubblePicture$: Observable<string>;

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
  bubblePictureSub: Subscription;

  constructor(
    private route: ActivatedRoute,
    private navCtrl: NavController,
    private chatboardStore: ChatboardStore,
    private afauth: AngularFireAuth,
    private firestore: AngularFirestore,
    private profilesStore: OtherProfilesStore,
    private chatboardPictures: ChatboardPicturesStore,
    private format: FormatService
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

    this.bubblePictureSub = this.chatboardPictures
      .activateStore(this.chatboardStore.allChats$)
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
          return forkJoin([
            this.chatboardPictures.storeInLocal(uid, pictures[0], true),
            this.chatboardPictures.addToHolder({ uids: [uid], urls: [pictures[0]] }),
          ]);
        })
      )
      .subscribe();

    this.recipientProfile$ = this.profilesStore.profiles$.pipe(
      withLatestFrom(this.thisChat$),
      map(([profiles, chat]) => profiles?.[chat?.recipient?.uid]),
      tap((a) => console.log("Profile from otherProfilesStore:", a))
    );
  }

  ngAfterViewInit() {
    // this.profCardView.changes.subscribe((p) => {
    //   console.log("profCardViewChildren: ", p);
    //   this.profCard = p;
    // });
    this.slides.lockSwipes(true);
    this.tabColor();
  }

  /** Subscribes to chatStore's Chats osbervable using chatID
   * from paramMap */
  private initialiseMessenger(parameter: ParamMap): Observable<any> {
    if (!parameter.has("chatID")) return from(this.navCtrl.navigateBack("/tabs/chats"));

    this.chatID = parameter.get("chatID");

    return this.chatboardStore.chats$.pipe(
      filter((chats) => !!chats?.[this.chatID]),
      take(1),
      map((chats) => {
        // Fills the chat subject with the data from the chatboard store
        this.thisChat$.next(chats[this.chatID]);
        this.latestChatInput = chats[this.chatID].latestChatInput;
      }),
      map(() => {
        // Activates the listener for this chat's messages and fills the messages subject
        // when something changes in the messages collection
        this.messagesDatabaseSub = this.firestore.firestore
          .collection("chats")
          .doc(this.chatID)
          .collection("messages")
          .orderBy("time", "desc")
          .limit(this.MSG_BATCH_SIZE)
          .onSnapshot({
            next: (snapshot: QuerySnapshot<messageFromDatabase>) => {
              this.messages$.next(
                this.format.messagesDatabaseToClass(
                  snapshot.docs.map((d) => d.data()).reverse()
                )
              );
            },
          });
      })
    );
  }

  sendMessage(): Observable<any> {
    const messageTime = new Date();
    console.log(this.latestChatInput);

    return this.afauth.user.pipe(
      tap((a) => console.log("auth$", a)),
      take(1),
      filter(() => !!this.latestChatInput), // prevents user from sending empty messages
      switchMap((user) => {
        console.log("a");
        if (!user) throw "no user authenticated";

        const message: messageFromDatabase = {
          senderID: user.uid,
          time: firebase.firestore.Timestamp.fromDate(messageTime),
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
      this.scaleProfile();
    } else if (page === "messenger") {
      this.slides.slidePrev();
    }

    this.slides.lockSwipes(true);

    await this.tabColor();
  }

  async tabColor() {
    var chat = document.getElementById("chat-head");
    var prof = document.getElementById("prof-head");

    var current = await this.slides.getActiveIndex();

    if (current == 0) {
      chat.style.color = "var(--ion-color-primary)";
      prof.style.color = "var(--ion-color-light-contrast)";
    } else {
      chat.style.color = "var(--ion-color-light-contrast)";
      prof.style.color = "var(--ion-color-primary)";
    }
  }

  scaleProfile() {
    setTimeout(() => {
      //get space available on slide for profile
      const aspectRatio = 0.583;
      const headerHeight = this.header.nativeElement.getBoundingClientRect().height;
      const profileHeight = Math.floor(
        this.profSlide.nativeElement.getBoundingClientRect().height - 20
      );
      const profileWidth = aspectRatio * profileHeight;
      const fullHeight = headerHeight + profileHeight + 20;
      const slideWidth = this.profSlide.nativeElement.getBoundingClientRect().width;
      const textRatio = profileHeight / fullHeight;
      console.log("profCard ElementRef", this.profCard);
      var profileCard = this.profCard.nativeElement; //full card element
      var swipeCard = this.grandchildren.swipe.nativeElement; //full card container element
      var snippet = this.grandchildren.snippet.nativeElement; //info before expand
      var title = this.grandchildren.name.nativeElement; //name text
      var subtitle = this.grandchildren.department.nativeElement; //department text
      console.log("grandChilder", this.grandchildren);
      var qcont = this.grandchildren.QandA.nativeElement; //question container
      var question = this.grandchildren.question.nativeElement; //question text
      var answer = this.grandchildren.answer.nativeElement; //answer text
      var shadow = this.grandchildren.shadow.nativeElement; //photo shadow gradient div

      //size card appropriately
      profileCard.style.height = `${profileHeight}px`;
      swipeCard.style.height = `${profileHeight}px`;
      swipeCard.style.margin = "0";
      profileCard.style.width = `${profileWidth}px`;

      //shape and place image shadow gradient
      shadow.style.width = `${profileWidth}px`;
      shadow.style.height = `${(20 / 85) * profileHeight}px`;
      shadow.style.top = `${(55 / 85) * profileHeight}px`;

      //get width of image
      var imageSlides = this.grandchildren.picture.nativeElement;
      var images: any = this.grandchildren.pictures;
      imageSlides.style.width = `${Math.round(profileWidth)}px`;
      images.forEach((img: ElementRef) => {
        img.nativeElement.style.width = `${profileWidth}px`;
      });

      //size and position info appropriately
      snippet.style.width = `${Math.round(profileWidth) + 2}px`;
      snippet.style.margin = "0 auto";
      snippet.style.maxHeight = "none";
      snippet.style.height = "none";
      snippet.style.left = "0";
      snippet.style.right = "0";

      //size and position q and a appropriately
      qcont.style.left = `${(slideWidth - profileWidth) / 2 + 10}px`;
      qcont.style.width = `${profileWidth - 15}px`;
      qcont.style.bottom = `${headerHeight - 45}px`;

      //size text
      title.style.fontSize = `${textRatio * 3.25}vh`;
      subtitle.style.fontSize = `${textRatio * 2.25}vh`;
      question.style.fontSize = `${textRatio * 2.75}vh`;
      answer.style.fontSize = `${textRatio * 2.5}vh`;

      //change slide transition to fit width
      this.grandchildren.slides.options = `{ 'spaceBetween': '${profileWidth}px' }`;
      this.grandchildren.bullets.forEach((bullet: ElementRef) => {
        bullet.nativeElement.style.display = "none";
      });
    }, 1000);
  }

  scaleInfo(event) {
    if (event === true) {
      const slideWidth = this.profSlide.nativeElement.getBoundingClientRect().width;

      var image = this.grandchildren.picture.nativeElement;
      const imageWidth = image.getBoundingClientRect().width;

      var complete = this.grandchildren.complete.nativeElement;
      var header = this.grandchildren.header.nativeElement;

      complete.style.width = `${imageWidth}px`;
      complete.style.left = `${(slideWidth - imageWidth) / 2}px`;
      header.style.width = `${imageWidth}px`;
    } else {
      this.scaleProfile();
    }
  }

  ngOnDestroy() {
    this.profileHandlingSub?.unsubscribe();
    this.scrollSub?.unsubscribe();
    this.bubblePictureSub?.unsubscribe();
    this.messagesDatabaseSub ? this.messagesDatabaseSub() : null;
  }
}
