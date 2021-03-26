import {
  Component,
  Input,
  AfterViewInit,
  OnDestroy,
  OnInit,
  ViewChild,
  ElementRef,
} from "@angular/core";

import {
  NavController,
  IonContent,
  IonSlides,
  IonSlide,
  IonHeader,
} from "@ionic/angular";
import { AngularFireAuth } from "@angular/fire/auth";
import { ActivatedRoute, ParamMap } from "@angular/router";

import { BehaviorSubject, Subscription, Observable } from "rxjs";
import { map } from "rxjs/operators";

import { Chat, Message, Profile } from "@classes/index";
import { SwipeStackStore, ChatStore } from "@stores/index";
import { ProfileCardComponent } from "@components/index";

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

  @ViewChild("profCard", { read: ElementRef }) profCard: ElementRef; //for styling
  @ViewChild("profCard") grandchildren: ProfileCardComponent; //for access to grandchildren

  profiles$: Subscription;
  chatProfiles: Profile[];
  chatProfile: Profile;

  // Constants
  private SCROLL_SPEED: number = 100;
  private CHAT_ID: string;

  // Storing latest chat input functionality
  public latestChatInput: string;

  // Scroll functionality
  private scroll$: Subscription;
  private timeOfNewestMsg: Date;

  private chats$: Subscription;
  public currentChat = new BehaviorSubject<Chat>(null);

  constructor(
    private route: ActivatedRoute,
    private navCtrl: NavController,
    private chatStore: ChatStore,
    private afauth: AngularFireAuth,
    private swipeStackStore: SwipeStackStore
  ) {}

  ngOnInit() {
    this.route.paramMap.subscribe((param) => this.messengerInitHandler(param));
    this.timeOfNewestMsg = this.lastInteracted();
    this.scroll$ = this.currentChat.subscribe((c) => this.scrollHandler(c));

    //Currently fetch profiles and outputting first one from subscription
    this.profiles$ = this.swipeStackStore.profiles.subscribe(
      (profile) => (this.chatProfiles = profile)
    );
    this.chatProfile = this.chatProfiles[0];
  }

  ngAfterViewInit() {
    this.slides.lockSwipes(true);
    this.tabColor();
  }

  /** Subscribes to chatStore's Chats osbervable using chatID
   * from paramMap */
  private messengerInitHandler(parameter: ParamMap) {
    if (!parameter.has("chatID")) return this.navCtrl.navigateBack("/tabs/chats");
    this.CHAT_ID = parameter.get("chatID");

    this.chats$ = this.chatStore.chats
      .pipe(
        map((chats) => {
          chats.forEach((chat) => {
            // this.chatProfile = db.getuserfromuid(chat.recipient.uid)
            if (chat.id === this.CHAT_ID) {
              this.currentChat.next(chat);
              if (!this.latestChatInput) {
                this.latestChatInput = chat.latestChatInput;
              }
            }
          });
        })
      )
      .subscribe();
  }

  /** Updates Chats object of chatStore,
   * subsequently updates chat on database */
  async sendMessage(): Promise<void> {
    const messageContent: string = this.latestChatInput;

    if (!messageContent) return;

    const chat: Chat = this.currentChat.getValue();
    if (!chat) return console.error("Chat object is empty");

    const user = await this.afauth.currentUser;
    if (!user) return console.error("User isn't logged in.");

    const time: Date = new Date();

    const newMessage: Message = new Message(
      user.uid,
      time,
      messageContent,
      null,
      "sending",
      false
    );

    this.latestChatInput = "";
    this.chatStore.localMessageAddition(newMessage, chat);
    this.chatStore.updateLastInteracted(chat, time);

    try {
      await this.chatStore.databaseUpdateMessages(chat);
      this.chatStore.updateMessageState(chat, newMessage, "sent");
    } catch (e) {
      console.error(`Message to ${chat.recipient.name} failed to send: ${e}`);
      this.chatStore.updateMessageState(chat, newMessage, "failed");
    }
  }

  /** Makes an attempt to change db version of chat's messages from local version */
  async retryUpdateMessage(message: Message) {
    if (!message || message.state !== "failed") return;

    const chat: Chat = this.currentChat.getValue();
    if (!chat) return console.error("Chat object is empty");

    try {
      await this.chatStore.databaseUpdateMessages(chat);
      this.chatStore.updateMessageState(chat, message, "sent");
    } catch (e) {
      console.error(`Message to ${chat.recipient.name} failed to send: ${e}`);
    }
  }

  /** Handles scrolling to bottom of messenger when there a new message is sent (on either side).
   * We assume a change in the time of the newest message means a new message appeared.
   */
  private scrollHandler(chat: Chat) {
    if (!chat?.messages) return;

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
    const chat = this.currentChat.getValue();
    if (!chat) return;
    return new Date(
      Math.max.apply(
        null,
        chat.messages.map((msg) => msg.time)
      )
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
    const chat: Chat = this.currentChat.getValue();
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

    var profileCard = this.profCard.nativeElement; //full card element
    var swipeCard = this.grandchildren.swipe.nativeElement; //full card container element
    var snippet = this.grandchildren.snippet.nativeElement; //info before expand
    var title = this.grandchildren.name.nativeElement; //name text
    var subtitle = this.grandchildren.department.nativeElement; //department text
    var qcont = this.grandchildren.QandA.nativeElement; //question container
    var question = this.grandchildren.question.nativeElement; //question text
    var answer = this.grandchildren.answer.nativeElement; //answer text

    //size card appropriately
    profileCard.style.height = `${profileHeight}px`;
    swipeCard.style.height = `${profileHeight}px`;
    swipeCard.style.margin = "0";
    profileCard.style.width = `${profileWidth}px`;

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
    this.chatStore.updateLatestChatInput(
      this.currentChat.getValue(),
      this.latestChatInput
    );
    this.chats$.unsubscribe();
    this.scroll$.unsubscribe();
  }
}
