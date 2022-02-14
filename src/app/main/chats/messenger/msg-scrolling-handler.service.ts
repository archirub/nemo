import {
  delay,
  distinctUntilChanged,
  exhaustMap,
  filter,
  firstValueFrom,
  ReplaySubject,
} from "rxjs";
import { Injectable } from "@angular/core";
import { IonContent } from "@ionic/angular";
import { isEqual } from "lodash";
import { Message } from "@classes/index";
import { MessagesService } from "./messages.service";

@Injectable()
export class MsgScrollingHandlerService {
  private SCROLL_SPEED = 100;
  private ionContentRef$ = new ReplaySubject<IonContent>(1);

  setRef(ref: IonContent) {
    this.ionContentRef$.next(ref);
  }

  async scrollToBottom(scrollSpeed: number = this.SCROLL_SPEED) {
    return firstValueFrom(this.ionContentRef$).then((ref) => {
      console.log("done now");

      return ref.scrollToBottom(scrollSpeed);
    });
  }

  /** Handles scrolling to bottom of messenger when there a new message is sent (on either side).
   */
  scrollHandler$ = this.msgService.messages$.pipe(
    filter((messages) => messages.length > 0),
    distinctUntilChanged((oldMessages, newMessages) =>
      isEqual(this.getMostRecent(oldMessages), this.getMostRecent(newMessages))
    ),
    delay(300),
    exhaustMap(() => this.scrollToBottom())
  );

  constructor(private msgService: MessagesService) {}

  // returns the most recent message of an array of messages
  private getMostRecent(messages: Message[]): Message {
    return messages.reduce((msg1, msg2) =>
      msg1.time.getTime() > msg2.time.getTime() ? msg1 : msg2
    );
  }
}
