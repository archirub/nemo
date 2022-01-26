import { NavController, IonContent, IonSlides, IonSearchbar } from "@ionic/angular";
import {
  Component,
  AfterViewInit,
  OnDestroy,
  OnInit,
  ViewChild,
  ElementRef,
} from "@angular/core";

import { AngularFirestore, DocumentChangeAction } from "@angular/fire/firestore";
import { ActivatedRoute } from "@angular/router";

import {
  BehaviorSubject,
  combineLatest,
  defer,
  firstValueFrom,
  forkJoin,
  lastValueFrom,
  Observable,
  of,
  ReplaySubject,
  Subject,
  Subscription,
  timer,
} from "rxjs";
import {
  delay,
  distinctUntilChanged,
  exhaustMap,
  filter,
  finalize,
  first,
  map,
  shareReplay,
  startWith,
  switchMap,
  take,
  tap,
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
import { messageFromDatabase } from "@interfaces/message.model";
import { messengerMotivationMessages, sortUIDs, CustomError } from "@interfaces/index";
import { Timestamp } from "@interfaces/firebase.model";

import { GlobalErrorHandler } from "@services/errors/global-error-handler.service";

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
  private newMessagesSub: Subscription = null;
  private loadingObserver: IntersectionObserver;

  latestChatInput: string; // Storing latest chat input functionality
  chosenPopup = this.randomMotivationMessage; //Will be randomly chosen from the list above onInit

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

  chat$ = new BehaviorSubject<Chat>(null); // used in template
  messages = new BehaviorSubject<Message[]>([]); // used in template
  // distinctUntilEqual here is super important (because of listenOnMoreMessages$ having as source observable messages$)
  // (and also because of handleShowLoading$)
  messages$ = this.messages.pipe(distinctUntilChanged((x, y) => isEqual(x, y)));

  sendingMessage$ = new BehaviorSubject<boolean>(false);
  private pageIsReady = new BehaviorSubject<boolean>(false);
  private hasFullyScrolledUp = new Subject<"">();

  pageIsReady$ = this.pageIsReady.asObservable().pipe(distinctUntilChanged());

  private hasFullyScrolledUp$ = this.hasFullyScrolledUp.asObservable();

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

  // Handles the loading of more messages when the user scrolls all the way to the oldest loaded messages
  moreMessagesLoadingHandler$ = this.loadingTriggerRef$.pipe(
    exhaustMap((loadingTriggerRef) => {
      // this serves to place a listener on whether the user has scrolled all the way up
      // it has this format as we have to wait for the "loadingTriggerRef" to be defined
      this.loadingObserver?.disconnect();
      this.loadingObserver = new IntersectionObserver(
        ([entry]) => entry.isIntersecting && this.hasFullyScrolledUp.next(""),
        { root: this.host.nativeElement }
      );
      this.loadingObserver.observe(loadingTriggerRef.nativeElement);

      return this.hasFullyScrolledUp$.pipe(
        switchMap((hfs) =>
          combineLatest([of(hfs), this.firstBatchArrived$.pipe(filter((fba) => !!fba))])
        ), // to make sure we are only loading more messages if the first batch has already arrived
        exhaustMap(() => timer(500)),
        // tap(() => this.showLoading$.next(true)),
        this.listenOnMoreMessages$
      );
    })
  );

  /**
   * Activates the listener for this chat's messages and fills the messages subject
   * when something changes in the messages collection
   * (Making this an operator worked so much better all of a sudden
   * It ensures the thing that triggers and drives the activation of the logic is the source itself, not some other
   * random thingy like of("").pipe(first()) or something like that)
   */
  listenOnMoreMessages$ = (source: Observable<any>) =>
    source.pipe(
      switchMap(() =>
        combineLatest([
          // this.scrollTop$.pipe(filter((st) => !!st)),
          of(1), // just for it not too bug as I push
          this.messages$,
          this.currentUser.user$.pipe(filter((u) => !!u)),
        ])
      ),
      map(
        ([scrollTop, msgs, user]) =>
          [scrollTop, msgs.length, user] as [number, number, AppUser]
      ),
      switchMap(([scrollTop, msgCount, user]) =>
        this.listenOnMessages(user.uid, msgCount + this.MSG_BATCH_SIZE, msgCount)
      )
    );
  // scrollTop$ = new BehaviorSubject<number>(0);

  // showLoading$ = new BehaviorSubject<boolean>(false);

  // handleShowLoading$ = this.firstBatchArrived$.pipe(
  //   filter((fba) => fba),
  //   delay(1000),
  //   exhaustMap(() =>
  //     combineLatest([
  //       this.hasFullyScrolledUp$.pipe(tap(() => this.showLoading$.next(true))),
  //       this.messages$.pipe(
  //         delay(300),
  //         tap(() => this.showLoading$.next(false))
  //       ),
  //     ])
  //   )
  // );

  // onLoadMore() {
  //   this.showLoading$.next(true)

  // }

  get randomMotivationMessage() {
    return messengerMotivationMessages[
      Math.floor(Math.random() * messengerMotivationMessages.length)
    ];
  }

  constructor(
    private route: ActivatedRoute,
    private navCtrl: NavController,
    private host: ElementRef,

    private firestore: AngularFirestore,

    private chatboardStore: ChatboardStore,
    private profilesStore: OtherProfilesStore,
    private chatboardPictures: ChatboardPicturesStore,
    private currentUser: CurrentUserStore,

    private errorHandler: GlobalErrorHandler,
    private format: FormatService,
    private userReporting: UserReportingService
  ) {
    // this.ionContentRef$.pipe(delay(4000)).subscribe((a) => {
    //   this.instantScroll(100);
    //   console.log("this.ionContentRef$", a.scrollToPoint(0, 163, 0));
    // });
    // this.ionContentRef$
    //   .pipe(
    //     switchMap((ref) => ref.),
    //     tap((a) => console.log("ionScroll", a))
    //   )
    //   .subscribe();
    // this.scrollElement.addScrollEventListener((e) => {
    //   console.log(e);
    // })
    // this.scrollTop$.subscribe((a) => console.log("scrollTop$", a));
  }
  registerScrolling($event) {
    // this.scrollTop$.next($event.detail.scrollTop);
    // console.log("ionScroll", $event.detail.scrollTop);
  }

  ngOnInit() {
    this.subs.add(this.scrollHandler$.subscribe());
    this.subs.add(this.otherProfileHandler$.subscribe());
    // this.subs.add(this.handleShowLoading$.subscribe());
    this.pageInitialization();
  }

  ngAfterViewInit() {
    this.subs.add(this.moreMessagesLoadingHandler$.subscribe());
    this.styleMessageBar();
    firstValueFrom(this.slidesRef$).then((ref) => ref.lockSwipes(true));
  }

  // initializes the page
  async pageInitialization() {
    const paramMap = await lastValueFrom(this.route.paramMap.pipe(first()));

    if (!paramMap.has("chatID")) {
      return this.navCtrl.navigateBack("/tabs/chats");
    }

    this.CHAT_ID = paramMap.get("chatID");

    lastValueFrom(this.initializeMessenger());

    await this.scrollToBottom();

    setTimeout(() => this.pageIsReady.next(true), 500);
  }

  /** Subscribes to chatStore's Chats observable using chatID
   * from paramMap */
  private initializeMessenger(): Observable<any> {
    return this.chatboardStore.chats$.pipe(
      filter((chats) => !!chats?.[this.CHAT_ID]),
      map((chats) => chats[this.CHAT_ID]),
      switchMap((chat) =>
        combineLatest([of(chat), this.currentUser.user$.pipe(filter((u) => !!u))])
      ),
      take(1),
      map(([chat, user]) => {
        // Fills the chat subject with the data from the chatboard store
        this.chat$.next(chat);
        this.latestChatInput = chat.latestChatInput;
        return user.uid;
      }),
      this.listenOnMoreMessages$
    );
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

  listenOnMessages(uid: string, newMsgCount: number, currMsgCount: number) {
    return this.firestore
      .collection("chats")
      .doc(this.CHAT_ID)
      .collection("messages", (ref) =>
        ref
          .where("uids", "array-contains", uid)
          .orderBy("time", "desc")
          .limit(newMsgCount)
      )
      .snapshotChanges()
      .pipe(
        this.errorHandler.convertErrors("firestore"),
        map((s: DocumentChangeAction<messageFromDatabase>[]) => {
          const docs = s.map((v) => v.payload.doc);

          // this is necessary because on updating the batch size,
          // we sometimes only get 1 message at first for some reason,
          // and that makes the messages rerender weirdly in ngFor loop
          if (currMsgCount > docs.length || docs.length <= 1) return;

          const messageMaps = docs
            .map((d) => ({ id: d.id, message: d.data() }))
            .reverse();

          const messages = this.format.messagesDatabaseToClass(messageMaps);

          this.messages.next(messages);
        }),
        this.errorHandler.handleErrors()
      );
  }

  // Sends the content of the input bar as a new message to the database
  sendMessage(): Observable<any> {
    const messageTime = new Date(); // this MUST be the same date sent to db as is checked below
    this.sendingMessage$.next(true);

    return this.errorHandler.getCurrentUser$().pipe(
      take(1),
      tap(() => console.log("sendMessage - Start of chain")),
      switchMap((u) => combineLatest([of(u), this.chat$.pipe(filter((c) => !!c))])),
      take(1),
      filter(() => !!this.latestChatInput), // prevents user from sending empty messages
      switchMap(([user, thisChat]) => {
        const message: messageFromDatabase = {
          uids: sortUIDs([thisChat.recipient.uid, user.uid]),
          senderID: user.uid,
          time: Timestamp.fromDate(messageTime),
          content: this.latestChatInput,
        };
        console.log("ici bah ");
        this.latestChatInput = "";

        return defer(() =>
          this.firestore.firestore
            .collection("chats")
            .doc(this.CHAT_ID)
            .collection("messages")
            .doc()
            .set(message)
        ).pipe(
          this.errorHandler.convertErrors("firestore"),
          this.errorHandler.handleErrors()
        );
      }),
      switchMap(() =>
        // for scrolling to bottom as soon as the new message appears in messages object
        this.messages$.pipe(
          filter(
            (msgs) => !!msgs.find((msg) => msg.time.getTime() === messageTime.getTime()) // makes sure we only scroll and mark as finished once we actually obtained the message was sent from the database
          ),
          first(),
          switchMap(() => this.scrollToBottom())
        )
      ),
      this.errorHandler.handleErrors(),
      finalize(() => {
        console.log("finalized triggered");
        this.sendingMessage$.next(false);
      })
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
      await (await firstValueFrom(profCardRef.slidesRef$)).slideTo(0);
      // profCardRef.updatePager(0);
      await slidesRef.slideNext();
    } else if (page === "messenger") {
      slidesRef.slidePrev();
    }

    slidesRef.lockSwipes(true);
  }

  async scrollToBottom() {
    return firstValueFrom(this.ionContentRef$).then((ref) =>
      ref.scrollToBottom(this.SCROLL_SPEED)
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
