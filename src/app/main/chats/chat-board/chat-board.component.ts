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
export class ChatBoardComponent implements OnInit, OnDestroy {
  chatboardPictures$: Observable<pictureHolder>;
  chatboardPicturesSub: Subscription;
  @Input() chats: Chat[];
  @Input() matches: Chat[];
  @ViewChild(IonContent) ionContent: IonContent;

  scrollToBottom$ = new Subject();
  additionalChatsLoadingSub: Subscription;

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

  // activateAdditionalChatsLoading(): Observable<any> {
  //   return this.scrollToBottom$.pipe(
  //     exhaustMap((_) => this.chatStore.incrementNumberOfChatsToListen())
  //   );
  // }

  ngAfterViewInit() {}

  constructor(
    private router: Router,
    private modalCtrl: ModalController,
    private tabElementRef: TabElementRefService,
    private chatboardPicturesService: ChatboardPicturesStore, // used in template
    private chatboardStore: ChatboardStore,
    private profilesStore: OtherProfilesStore
  ) {
    this.onResize();
  }

  modal: HTMLIonModalElement;
  MatchesEnterAnimation;
  MatchesLeaveAnimation;

  ngOnInit() {
    this.profilesStore.profiles$.subscribe((a) =>
      console.log("Profile store content:", a)
    );
    this.chatboardPictures$ = this.chatboardPicturesService.holder$;
    this.chatboardPicturesSub = this.chatboardPicturesService
      .activateStore(this.chatboardStore.chats$)
      .subscribe();
    setTimeout(() => console.log("chats:", this.chats), 4000);
    // this.additionalChatsLoadingSub = this.activateAdditionalChatsLoading().subscribe();
  }

  ngOnDestroy() {
    this.chatboardPicturesSub?.unsubscribe();
    this.additionalChatsLoadingSub?.unsubscribe();
  }

  async presentMatches(): Promise<void> {
    // console.log("Matches modal initialised");

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

    this.modalCtrl
      .create({
        component: MatchesComponent,
        componentProps: { matches: this.matches },
        enterAnimation: this.MatchesEnterAnimation,
        leaveAnimation: this.MatchesLeaveAnimation,
      })
      .then((m) => {
        this.modal = m;
        this.onModalDismiss(this.modal);
      });

    setTimeout(() => {
      return this.modal.present();
    }, 200);
  }

  // Used to preload modal as soon as the previous modal was dismissed
  // Shamelessly adapted from the homepage SC modal
  onModalDismiss(modal: HTMLIonModalElement) {
    if (!modal) return;
    modal.onDidDismiss().then(() => {
      this.modalCtrl
        .create({
          component: MatchesComponent,
          enterAnimation: this.MatchesEnterAnimation,
          leaveAnimation: this.MatchesLeaveAnimation,
        })
        .then((m) => {
          this.modal = m;
          return this.modal;
        })
        .then((m) => this.onModalDismiss(m));
    });
  }

  shorten(sentence: string) {
    if (sentence.length > 25) {
      let shortenedSentence = sentence.slice(0, 25);
      if (shortenedSentence.endsWith(" " || ".")) {
        shortenedSentence = sentence.slice(0, 24);
      }
      return shortenedSentence + "...";
    }
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
