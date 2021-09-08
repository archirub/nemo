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
import { IonContent, ModalController } from "@ionic/angular";

import { Chat } from "@classes/index";
import { MatchesEnterAnimation, MatchesLeaveAnimation } from "@animations/index";
import { MatchesComponent } from "../matches/matches.component";
import { TabElementRefService } from "src/app/main/tab-menu/tab-element-ref.service";
import {
  ChatboardPicturesStore,
  pictureHolder,
} from "@stores/pictures/chatboard-pictures-store/chatboard-pictures.service";
import { forkJoin, fromEvent, Observable, of, Subject, Subscription } from "rxjs";
import { concatMap, exhaustMap, map, tap } from "rxjs/operators";
import { ChatboardStore, OtherProfilesStore } from "@stores/index";
import { FadeOutAnimation } from "@animations/fade-out.animation";

@Component({
  selector: "app-chat-board",
  templateUrl: "./chat-board.component.html",
  styleUrls: ["./chat-board.component.scss"],
})
export class ChatBoardComponent implements OnInit {
  chatboardPictures$: Observable<pictureHolder>;
  picsLoaded$: Subscription;
  picsLoaded: boolean = false;

  fadeOutAnimation;

  @Output() loaded = new EventEmitter();

  @Input() chats: Chat[];
  @Input() matches: Chat[];
  @ViewChild(IonContent) ionContent: IonContent;

  // PROPERTIES FOR MODAL ANIMATION
  @ViewChild("chatContainer", { read: ElementRef }) chatContainer: ElementRef;
  @ViewChild("matchesButton", { read: ElementRef }) matchesButton: ElementRef;

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
    private domSanitizer: DomSanitizer
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
    this.picsLoaded$ = this.chatboardPicturesService.allPicturesLoaded$.subscribe(
      (res) => {
        this.picsLoaded = res;
        if (this.picsLoaded === true) {
          this.loaded.emit(this.picsLoaded);
        }
      }
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
      componentProps: { matches: this.matches },
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

  deleteChat(event, chat: Chat) {
    console.log("deleting chat with", chat.recipient.name);

    let target: HTMLElement = event.target; //Get list item where click occurred

    while (!target.classList.contains("parent")) {
      //Checks parent until it finds full list box
      target = target.parentElement;
    }

    //Gets index of chat
    let index = this.chats.findIndex((c) => c === chat);
    let name = chat.recipient.name;

    //Fades out list element
    this.fadeOutAnimation = FadeOutAnimation(target, 300);
    this.fadeOutAnimation.play();

    //Gets rid of chat from local DOM
    setTimeout(() => {
      this.chats.splice(index, 1);

      /** HERE IS WHERE YOU WANT TO SEND DELETION TO BACKEND
       * I SUGGEST BRINGING UP A POPUP INCLUDING THE CHAT RECIPIENT NAME
       * NAME IS STORED IN A VARIABLE IN FUNCTION IF NECESSARY
       * TIMEOUT IS FOR ANIMATION TO PLAY
       **/
    }, 400);
  }

  scroll(speed) {
    this.ionContent.scrollToTop(speed);
  }

  goToMessenger(chatID: String) {
    this.router.navigate(["main/messenger/" + chatID]);
  }

  /* Automates left margin of 'number matches' text so that it is never covered by match images */
  styleFromMatches() {
    var images = document.getElementsByClassName("match-image");
    var text = document.getElementById("match-text");
    text.style.marginLeft = `${(images.length - 1) * 20}px`;
  }
}
