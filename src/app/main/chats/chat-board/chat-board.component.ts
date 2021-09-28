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
  ChangeDetectorRef,
  OnDestroy,
  Renderer2,
  EventEmitter,
} from "@angular/core";
import { Router } from "@angular/router";
import {
  AlertController,
  IonContent,
  IonItemOptions,
  IonItemSliding,
  IonTabs,
  LoadingController,
  ModalController,
} from "@ionic/angular";

import { Chat } from "@classes/index";
import { MatchesEnterAnimation, MatchesLeaveAnimation } from "@animations/index";
import { MatchesComponent } from "../matches/matches.component";
import { TabElementRefService } from "src/app/main/tab-menu/tab-element-ref.service";
import {
  ChatboardPicturesStore,
  pictureHolder,
} from "@stores/pictures/chatboard-pictures/chatboard-pictures.service";
import { forkJoin, fromEvent, Observable, of, Subject, Subscription, timer } from "rxjs";
import { concatMap, delay, exhaustMap, first, map, switchMap, tap } from "rxjs/operators";
import { ChatboardStore, OtherProfilesStore } from "@stores/index";
import { FadeOutAnimation } from "@animations/fade-out.animation";
import { StoreReadinessService } from "@services/store-readiness/store-readiness.service";

@Component({
  selector: "app-chat-board",
  templateUrl: "./chat-board.component.html",
  styleUrls: ["./chat-board.component.scss"],
})
export class ChatBoardComponent implements OnInit {
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

  constructor(
    private router: Router,
    private modalCtrl: ModalController,
    private tabElementRef: TabElementRefService,
    private chatboardPicturesService: ChatboardPicturesStore, // used in template
    private domSanitizer: DomSanitizer,
    private renderer: Renderer2,
    private pageReadiness: StoreReadinessService,
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
    this.subs.add(this.pageReadinessHandler().subscribe());
  }

  pageReadinessHandler() {
    return this.pageReadiness.chats$.pipe(
      tap((ready) => {
        this.picsLoaded = ready;
        this.loaded.emit(ready);
      })
    );
  }

  async presentMatches(): Promise<void> {
    this.MatchesEnterAnimation = MatchesEnterAnimation(
      this.matchesButton,
      this.tabElementRef.tabRef,
      this.chatContainer,
      this.screenHeight,
      this.screenWidth
    );
    this.MatchesLeaveAnimation = MatchesLeaveAnimation(
      this.matchesButton,
      this.tabElementRef.tabRef,
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
    this.router.navigate(["main/messenger/" + chatID]);
  }

  goToCatch() {
    this.router.navigateByUrl("main/tabs/home");
  }

  /* Automates left margin of 'number matches' text so that it is never covered by match images */
  styleFromMatches() {
    const images = document.getElementsByClassName("match-image");
    const text = document.getElementById("match-text");
    this.renderer.setStyle(text, "marginLeft", `${(images.length - 1) * 20}px`);
  }
}
