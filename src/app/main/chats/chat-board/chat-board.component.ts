import { IonItemSliding, NavController } from "@ionic/angular";
import {
  Component,
  Input,
  ViewChild,
  OnInit,
  AfterViewInit,
  Output,
  EventEmitter,
} from "@angular/core";

import { BehaviorSubject, combineLatest, firstValueFrom, Subscription } from "rxjs";
import { distinctUntilChanged, filter, map, tap } from "rxjs/operators";

import { ChatboardPicturesStore } from "@stores/pictures/chatboard-pictures/chatboard-pictures.service";
import { ChatboardStore } from "@stores/index";
import { StoreReadinessService } from "@services/store-readiness/store-readiness.service";

import { Chat } from "@classes/index";
import { FadeOutAnimation } from "@animations/fade-out.animation";
import { LoadingAndAlertManager } from "@services/loader-and-alert-manager/loader-and-alert-manager.service";
import { AppToggleComponent } from "@components/index";
import { wait } from "src/app/shared/functions/common";

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
  @ViewChild("chatDeleteRef") chatDeleteRef: IonItemSliding;
  @ViewChild("catchDeleteRef") catchDeleteRef: IonItemSliding;
  @ViewChild("chatToggle") chatToggle: AppToggleComponent;

  chatboardPictures$ = this.chatboardPicturesService.holder$; // used in template

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
    private chatboardPicturesService: ChatboardPicturesStore,
    private storeReadiness: StoreReadinessService,
    private chatboardStore: ChatboardStore,
    private loadingAlertManager: LoadingAndAlertManager
  ) {}

  ngOnInit() {
    this.subs.add(this.readinessHandler$.subscribe());
  }

  ngAfterViewInit() {
    this.viewIsReady$.next(true);
  }

  // for deleting a particular chat
  async deleteChat(event, chat: Chat) {
    const onCancel = () => {};

    const onConfirm = async () => {
      // create loader
      const loader = await this.loadingAlertManager.createLoading({
        message: "Deleting chat with " + chat.recipient.name,
        spinner: "bubbles",
        backdropDismiss: false,
      });

      // show loader
      await this.loadingAlertManager.presentNew(loader, "replace-erase");

      // attempt to delete the chat on the database
      try {
        await firstValueFrom(this.chatboardStore.deleteChatOnDatabase(chat.id));
      } catch {
        // if unsuccesful, dismiss loader and show alert saying there was an error
        await this.loadingAlertManager.dismissDisplayed();

        const errorAlert = await this.loadingAlertManager.createAlert({
          header: "An error occured",
          message: "Your chat with " + chat.recipient.name + " could not be deleted... ",
          buttons: ["Okay"],
        });

        return this.loadingAlertManager.presentNew(errorAlert, "replace-erase");
      }

      // get element for fadeOut animation
      let target: HTMLElement = event.target; //Get list item where click occurred
      while (!target.classList.contains("parent")) {
        //Checks parent until it finds full list box
        target = target.parentElement;
      }

      await this.loadingAlertManager.dismissDisplayed();

      //Fades out the chatboard list element which just got deleted
      await FadeOutAnimation(target, 200).play();

      await wait(200);

      return firstValueFrom(this.chatboardStore.deleteChatInStore(chat.id));
    };

    // make "delete" side slide close before starting this procedure
    await Promise.all([
      this.chatDeleteRef?.closeOpened(),
      this.catchDeleteRef?.closeOpened(),
    ]);

    const alert = await this.loadingAlertManager.createAlert({
      header: "Delete chat with " + chat.recipient.name + "?",
      message: "All information about this conversation will be deleted.",
      buttons: [
        {
          role: "cancel",
          text: "Cancel",
          handler: onCancel,
        },
        { text: "Delete", handler: onConfirm },
      ],
    });

    return alert.present();
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
    return day.toString() + "/" + month.toString();
  }

  // For use in template. To toggle between chats and catches (should really be a behaviorSubject)
  setView(event: "chats" | "catches") {
    if (event === "chats") {
      this.chatToggle.catchToggle = false;
    } else {
      this.chatToggle.catchToggle = true;
    }
    this.view = event;
  }

  // go to messenger of chat with chat id = chatID
  goToMessenger(chatID: String) {
    return this.navCtrl.navigateForward(["main/messenger/" + chatID]);
  }

  goToChats() {
    return this.navCtrl.navigateForward("main/tabs/chats");
  }

  // go to home page
  goToHome() {
    return this.navCtrl.navigateForward("main/tabs/home");
  }

  // for trackBy of ngFor loop on chats
  trackChat(index: number, chat: Chat) {
    return chat?.id;
  }
}
