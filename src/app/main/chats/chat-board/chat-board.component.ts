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
  EventEmitter
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
} from "@stores/pictures-stores/chatboard-pictures-store/chatboard-pictures.service";
import { forkJoin, fromEvent, Observable, of, Subject, Subscription } from "rxjs";
import { concatMap, exhaustMap, map, tap } from "rxjs/operators";
import { ChatboardStore, OtherProfilesStore } from "@stores/index";

@Component({
  selector: "app-chat-board",
  templateUrl: "./chat-board.component.html",
  styleUrls: ["./chat-board.component.scss"],
})
export class ChatBoardComponent implements OnInit {
  chatboardPictures$: Observable<pictureHolder>;
  picsLoaded$: Subscription;
  picsLoaded: boolean = false;

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
    private chatboardPicturesService: ChatboardPicturesStore // used in template
  ) {
    this.onResize();
  }

  modal: HTMLIonModalElement;
  MatchesEnterAnimation;
  MatchesLeaveAnimation;

  ngOnInit() {
    this.chatboardPictures$ = this.chatboardPicturesService.holder$;
    this.picsLoaded$ = this.chatboardPicturesService.allPicturesLoaded$.subscribe(res => {
      this.picsLoaded = res;
      if (this.picsLoaded === true) {
        this.loaded.emit(this.picsLoaded);
      };
    });
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
