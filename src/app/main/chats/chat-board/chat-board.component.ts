import {
  AlertController,
  IonContent,
  IonItemSliding,
  LoadingController,
  NavController,
} from "@ionic/angular";
import {
  Component,
  Input,
  ViewChild,
  HostListener,
  OnInit,
  AfterViewInit,
  Output,
  EventEmitter,
} from "@angular/core";

import { BehaviorSubject, combineLatest, Subscription, timer } from "rxjs";
import { distinctUntilChanged, filter, first, map, switchMap, tap } from "rxjs/operators";

import { ChatboardPicturesStore } from "@stores/pictures/chatboard-pictures/chatboard-pictures.service";
import { ChatboardStore } from "@stores/index";
import { StoreReadinessService } from "@services/store-readiness/store-readiness.service";

import { Chat } from "@classes/index";
import { FadeOutAnimation } from "@animations/fade-out.animation";

@Component({
  selector: "app-chat-board",
  templateUrl: "./chat-board.component.html",
  styleUrls: ["./chat-board.component.scss"],
})
export class ChatBoardComponent implements OnInit, AfterViewInit {
  view: "chats" | "catches" = "chats";

  private subs = new Subscription();

  @Input() chats: Chat[];
  @Input() matches: Chat[];
  @Output() chatboardReady = new EventEmitter();
  @ViewChild(IonContent) ionContent: IonContent;
  @ViewChild("chatDeleteRef") chatDeleteRef: IonItemSliding;

  chatboardPictures$ = this.chatboardPicturesService.holder$;

  viewIsReady$ = new BehaviorSubject<boolean>(false);
  pageIsReady$ = combineLatest([this.viewIsReady$, this.storeReadiness.ownProfile$]).pipe(
    map(([a, b]) => a && b),
    distinctUntilChanged()
  );

  readinessHandler$ = this.pageIsReady$.pipe(
    filter((ready) => ready),
    tap((ready) => this.chatboardReady.emit(ready))
  );

  constructor(
    private navCtrl: NavController,
    private chatboardPicturesService: ChatboardPicturesStore, // used in template
    private storeReadiness: StoreReadinessService,
    private chatboardStore: ChatboardStore,
    private loadingCtrl: LoadingController,
    private alertCtrl: AlertController
  ) {}

  ngOnInit() {
    this.subs.add(this.readinessHandler$.subscribe());
  }

  ngAfterViewInit() {
    this.viewIsReady$.next(true);
  }

  // for deleting a particular chat
  async deleteChat(event, chat: Chat) {
    // make "delete" side slide close before starting this procedure
    await this.chatDeleteRef.close();

    // create loader
    const loader = await this.loadingCtrl.create({
      message: "Deleting chat with " + chat.recipient.name,
      spinner: "bubbles",
      backdropDismiss: false,
    });

    // show loader
    await loader.present();

    // attempt to delete the chat on the database
    try {
      await this.chatboardStore.deleteChatOnDatabase(chat.id).toPromise();
    } catch {
      // if unsuccesful, dismiss loader and show alert saying there was an error
      await loader.dismiss();

      return this.alertCtrl
        .create({
          header: "An error occured",
          message: "Your chat with " + chat.recipient.name + " could not be deleted... ",
          buttons: ["Okay"],
        })
        .then((a) => a.present());
    }

    // get element for fadeOut animation
    let target: HTMLElement = event.target; //Get list item where click occurred
    while (!target.classList.contains("parent")) {
      //Checks parent until it finds full list box
      target = target.parentElement;
    }

    await loader.dismiss();

    //Fades out the chatboard list element which just got deleted
    await FadeOutAnimation(target, 300).play();

    await timer(400)
      .pipe(
        first(),
        switchMap(() => this.chatboardStore.deleteChatInStore(chat.id))
      )
      .toPromise();
  }

  // for use in chat page
  scroll(speed) {
    this.ionContent.scrollToTop(speed);
  }

  // for shortening last message
  shorten(sentence: string) {
    if (sentence.length > 25) {
      let shortenedSentence = sentence.slice(0, 25);
      if (shortenedSentence.endsWith(" " || ".")) {
        shortenedSentence = sentence.slice(0, 24);
      }
      return shortenedSentence + "...";
    } else return sentence;
  }

  // for transforming date format to string format (should be an Angular pipe for cleanliness)
  getDate(date: Date) {
    let month = date.getMonth();
    let day = date.getDay();
    return day.toString() + "/" + month.toString;
  }

  // For use in template. To toggle between chats and catches (should really be a behaviorSubject)
  setView(event: "chats" | "catches") {
    this.view = event;
  }

  // got messenger of chat with chat id = chatID
  goToMessenger(chatID: String) {
    this.navCtrl.navigateForward(["main/messenger/" + chatID]);
  }

  // go to home page
  goToHome() {
    return this.navCtrl.navigateRoot("main/home");
  }

  // for trackBy of ngFor loop on chats
  trackChat(index: number, chat: Chat) {
    return chat.id;
  }
}
