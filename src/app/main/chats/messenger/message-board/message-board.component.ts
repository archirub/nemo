import { SubscribeAndLog } from "../../../../shared/functions/custom-rxjs";
import { Message } from "../../../../shared/classes/message.class";
import { Component, Input, OnInit, ViewChild, ViewEncapsulation } from "@angular/core";
import { filter, firstValueFrom, interval, map, Observable, ReplaySubject } from "rxjs";
import { IonInfiniteScroll } from "@ionic/angular";
import { MessagesService } from "../messages.service";

@Component({
  selector: "app-message-board",
  templateUrl: "./message-board.component.html",
  styleUrls: ["./message-board.component.scss"],
})
export class MessageBoardComponent implements OnInit {
  @Input() messages$: Observable<Message[]>;

  private infiniteScrollRef$ = new ReplaySubject<IonInfiniteScroll>(1);
  @ViewChild(IonInfiniteScroll) set infiniteScrollSetter(ref: IonInfiniteScroll) {
    if (ref) this.infiniteScrollRef$.next(ref);
  }

  constructor(private msgService: MessagesService) {}

  ngOnInit() {
    SubscribeAndLog(this.messages$, "messages$");
    this.manageInfiniteScroll();
  }

  async manageInfiniteScroll() {
    const infiniteScrollRef = await firstValueFrom(this.infiniteScrollRef$);
    // waits at least for first batch to arrive before
    await this.returnOnFirstBatchArrived();
    // waits for additional 2 seconds this is only to leave it time to scroll down
    await later(2000);
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
function later(delay) {
  return new Promise(function (resolve) {
    setTimeout(resolve, delay);
  });
}
