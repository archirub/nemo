import { Component, OnInit, ViewChild } from "@angular/core";
import { IonInfiniteScroll } from "@ionic/angular";

import { filter, firstValueFrom, ReplaySubject } from "rxjs";

import { MessagesService } from "../messages.service";

import { Message } from "@classes/index";
import { SubscribeAndLog } from "src/app/shared/functions/custom-rxjs";
import { wait } from "src/app/shared/functions/common";

@Component({
  selector: "app-message-board",
  templateUrl: "./message-board.component.html",
  styleUrls: ["./message-board.component.scss"],
})
export class MessageBoardComponent implements OnInit {
  messages$ = this.msgService.messages$;
  chat$ = this.msgService.chat$;
  allMessagesLoaded$ = this.msgService.allMessagesLoaded$;

  private infiniteScrollRef$ = new ReplaySubject<IonInfiniteScroll>(1);
  @ViewChild(IonInfiniteScroll) set infiniteScrollSetter(ref: IonInfiniteScroll) {
    if (ref) this.infiniteScrollRef$.next(ref);
  }

  constructor(private msgService: MessagesService) {}

  ngOnInit() {
    this.manageInfiniteScroll();
    SubscribeAndLog(this.allMessagesLoaded$, " allMessagesLoaded$");
  }

  async manageInfiniteScroll() {
    const infiniteScrollRef = await firstValueFrom(this.infiniteScrollRef$);
    // waits at least for first batch to arrive before
    await this.returnOnFirstBatchArrived();
    // waits for additional 2 seconds this is only to leave it time to scroll down
    await wait(2000);
    // only then disables the infinite scroll
    infiniteScrollRef.disabled = false;
  }

  async returnOnFirstBatchArrived() {
    return firstValueFrom(
      this.msgService.firstBatchArrived$.pipe(filter((fba) => fba === true))
    );
  }

  async loadMoreMessages(event) {
    console.log("loadMoreMessages");
    await firstValueFrom(this.msgService.listenToMoreMessages());

    event.target.complete();
  }

  // for trackBy of ngFor on messages
  trackMessage(index: number, message: Message) {
    return message.messageID;
  }
}
