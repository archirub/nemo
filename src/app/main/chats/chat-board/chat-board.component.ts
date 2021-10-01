import { DomSanitizer } from "@angular/platform-browser";
import {
  Component,
  Input,
  ViewChild,
  ElementRef,
  HostListener,
  OnInit,
  AfterViewInit,
  Output,
  Renderer2,
  EventEmitter,
} from "@angular/core";
import { Router } from "@angular/router";
import {
  AlertController,
  IonContent,
  IonItemSliding,
  IonTabs,
  LoadingController,
  ModalController,
  NavController,
} from "@ionic/angular";

import { Chat } from "@classes/index";
import { MatchesEnterAnimation, MatchesLeaveAnimation } from "@animations/index";
import { MatchesComponent } from "../matches/matches.component";
import { TabElementRefService } from "src/app/main/tab-menu/tab-element-ref.service";
import {
  ChatboardPicturesStore,
  pictureHolder,
} from "@stores/pictures/chatboard-pictures/chatboard-pictures.service";
import {
  BehaviorSubject,
  combineLatest,
  forkJoin,
  fromEvent,
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
  switchMap,
  tap,
} from "rxjs/operators";
import { ChatboardStore, OtherProfilesStore } from "@stores/index";
import { FadeOutAnimation } from "@animations/fade-out.animation";
import { StoreReadinessService } from "@services/store-readiness/store-readiness.service";

@Component({
  selector: "app-chat-board",
  templateUrl: "./chat-board.component.html",
  styleUrls: ["./chat-board.component.scss"],
})
export class ChatBoardComponent implements OnInit, AfterViewInit {
  chatboardPictures$: Observable<pictureHolder>;
  picsLoaded: boolean = false;

  subs = new Subscription();

  view: string = "chats";

  @Output() loaded = new EventEmitter();

  @Input() chats: Chat[];
  @Input() matches: Chat[];
  @ViewChild(IonContent) ionContent: IonContent;
  @ViewChild(IonTabs) tabs: IonTabs;

  // PROPERTIES FOR MODAL ANIMATION
  @ViewChild("chatContainer", { read: ElementRef }) chatContainer: ElementRef;
  @ViewChild("matchesButton", { read: ElementRef }) matchesButton: ElementRef;

  @ViewChild("chatDeleteRef") chatDeleteRef: IonItemSliding;

  screenHeight: number;
  screenWidth: number;
  @HostListener("window:resize", ["$event"])
  onResize() {
    this.screenHeight = window.innerHeight;
    this.screenWidth = window.innerWidth;
  }

  private viewIsReady$ = new BehaviorSubject<boolean>(false);
  get pageIsReady$() {
    return combineLatest([this.viewIsReady$, this.storeReadiness.ownProfile$]).pipe(
      map(([a, b]) => a && b),
      distinctUntilChanged()
    );
  }

  constructor(
    private navCtrl: NavController,
    private modalCtrl: ModalController,
    private tabElementRef: TabElementRefService,
    private chatboardPicturesService: ChatboardPicturesStore, // used in template
    private domSanitizer: DomSanitizer,
    private renderer: Renderer2,
    private storeReadiness: StoreReadinessService,
    private chatboardStore: ChatboardStore,
    private loadingCtrl: LoadingController,
    private alertCtrl: AlertController
  ) {
    this.onResize();
  }

  modal: HTMLIonModalElement;
  MatchesEnterAnimation;
  MatchesLeaveAnimation;

  ngOnInit() {
    this.chatboardPictures$ = this.chatboardPicturesService.holder$.pipe(
      map((holder) => {
        // const sanitisedHolder = [];
        // Object.keys(holder).forEach((uid) =>
        //   sanitisedHolder.push([holder[uid], this.domSanitizer.sanitize(4, holder[uid])])
        // );
        // console.log("comparison:" + JSON.stringify(sanitisedHolder));
        // return sanitisedHolder;
        return holder;
      })
    );
    this.readinessHandler();
  }

  ngAfterViewInit() {
    this.viewIsReady$.next(true);
  }

  readinessHandler() {
    this.subs.add(
      this.pageIsReady$
        .pipe(
          filter((ready) => ready),
          tap((ready) => {
            this.picsLoaded = ready;
            this.loaded.emit(ready);
          })
        )
        .subscribe()
    );
  }

  async presentMatches(): Promise<void> {
    this.MatchesEnterAnimation = MatchesEnterAnimation(
      this.matchesButton,
      this.tabElementRef.tabsRef,
      this.chatContainer,
      this.screenHeight,
      this.screenWidth
    );
    this.MatchesLeaveAnimation = MatchesLeaveAnimation(
      this.matchesButton,
      this.tabElementRef.tabsRef,
      this.chatContainer,
      this.screenHeight,
      this.screenWidth
    );

    this.modal = await this.modalCtrl.create({
      component: MatchesComponent,
      componentProps: { chats: this.matches },
      enterAnimation: this.MatchesEnterAnimation,
      leaveAnimation: this.MatchesLeaveAnimation,
    });
    // .then((m) => {
    //   this.modal = m;
    //   this.onModalDismiss(this.modal);
    // });

    return this.modal.present();
  }

  // Used to preload modal as soon as the previous modal was dismissed
  // Shamelessly adapted from the homepage SC modal
  // onModalDismiss(modal: HTMLIonModalElement) {
  //   if (!modal) return;
  //   modal.onDidDismiss().then(() => {
  //     this.modalCtrl
  //       .create({
  //         component: MatchesComponent,
  //         enterAnimation: this.MatchesEnterAnimation,
  //         leaveAnimation: this.MatchesLeaveAnimation,
  //       })
  //       .then((m) => {
  //         this.modal = m;
  //         return this.modal;
  //       })
  //       .then((m) => this.onModalDismiss(m));
  //   });
  // }

  shorten(sentence: string) {
    if (sentence.length > 25) {
      let shortenedSentence = sentence.slice(0, 25);
      if (shortenedSentence.endsWith(" " || ".")) {
        shortenedSentence = sentence.slice(0, 24);
      }
      return shortenedSentence + "...";
    } else return sentence;
  }

  getDate(date: Date) {
    let month = date.getMonth();
    let day = date.getDay();
    return day.toString() + "/" + month.toString;
  }

  async deleteChat(event, chat: Chat) {
    // make slide close before starting this procedure
    await this.chatDeleteRef.close();

    const loader = await this.loadingCtrl.create({
      message: "Deleting chat with " + chat.recipient.name,
      spinner: "bubbles",
      backdropDismiss: false,
    });

    await loader.present();
    try {
      await this.chatboardStore.deleteChatOnDatabase(chat.id).toPromise();
    } catch {
      await loader.dismiss();

      const alert = await this.alertCtrl.create({
        header: "An error occured",
        message: "Your chat with " + chat.recipient.name + " could not be deleted... ",
        buttons: ["Okay"],
      });

      return alert.present();
    }

    let target: HTMLElement = event.target; //Get list item where click occurred
    while (!target.classList.contains("parent")) {
      //Checks parent until it finds full list box
      target = target.parentElement;
    }

    await loader.dismiss();

    //Fades out list element
    FadeOutAnimation(target, 300).play();

    await timer(400)
      .pipe(
        first(),
        switchMap(() => this.chatboardStore.deleteChatInStore(chat.id))
      )
      .toPromise();

    // //Gets rid of chat from local DOM
    // setTimeout(() => {
    //   this.chatboardStore.deleteChatInStore(chat.id)

    //   /** HERE IS WHERE YOU WANT TO SEND DELETION TO BACKEND
    //    * I SUGGEST BRINGING UP A POPUP INCLUDING THE CHAT RECIPIENT NAME
    //    * NAME IS STORED IN A VARIABLE IN FUNCTION IF NECESSARY
    //    * TIMEOUT IS FOR ANIMATION TO PLAY
    //    **/
    // }, 400);
  }

  animateSuccessfulChatDeletion(event) {}

  scroll(speed) {
    this.ionContent.scrollToTop(speed);
  }

  setView(event) {
    this.view = event;
  }

  goToMessenger(chatID: String) {
    this.navCtrl.navigateForward(["main/messenger/" + chatID]);
  }

  goToCatch() {
    return this.tabElementRef.tabs.select("home");
  }

  /* Automates left margin of 'number matches' text so that it is never covered by match images */
  styleFromMatches() {
    const images = document.getElementsByClassName("match-image");
    const text = document.getElementById("match-text");
    this.renderer.setStyle(text, "marginLeft", `${(images.length - 1) * 20}px`);
  }
}
