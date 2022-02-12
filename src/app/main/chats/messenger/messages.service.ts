import { AngularFirestore, QueryDocumentSnapshot } from "@angular/fire/firestore";

import { isEqual } from "lodash";
import { BehaviorSubject, combineLatest, defer, Observable } from "rxjs";
import {
  delay,
  distinctUntilChanged,
  filter,
  finalize,
  map,
  mapTo,
  shareReplay,
  switchMap,
  take,
  tap,
} from "rxjs/operators";

import { Chat, Message } from "@classes/index";

import { messageFromDatabase } from "@interfaces/message.model";
import { sortUIDs } from "@interfaces/index";
import { Timestamp } from "@interfaces/firebase.model";
import { GlobalErrorHandler } from "@services/errors/global-error-handler.service";
import { FormatService } from "@services/format/format.service";
import { Injectable } from "@angular/core";
import { FilterFalsy } from "src/app/shared/functions/custom-rxjs";

@Injectable({ providedIn: "root" })
export class MessagesService {
  private MSG_BATCH_SIZE: number = 15;

  private messages = new BehaviorSubject<Message[]>([]);
  private chat = new BehaviorSubject<Chat>(null);
  private allMessagesLoaded = new BehaviorSubject<boolean>(false);
  private sendingMessage = new BehaviorSubject<boolean>(false);

  // distinctUntilEqual here is super important (because of listenOnMoreMessages$ having as source observable messages$)
  // (and also because of handleShowLoading$)
  messages$ = this.messages.pipe(distinctUntilChanged((x, y) => isEqual(x, y)));
  chat$ = this.chat.pipe(distinctUntilChanged((x, y) => isEqual(x, y)));
  sendingMessage$ = this.sendingMessage.pipe(distinctUntilChanged());
  allMessagesLoaded$ = this.allMessagesLoaded.pipe(distinctUntilChanged());

  // emits once the first batch of messages has arrived.
  // this is for the moreMessagesLoadingHandler
  firstBatchArrived$ = this.messages$.pipe(
    map((msgs) => msgs.length > 1),
    distinctUntilChanged(),
    delay(400),
    shareReplay()
  );

  constructor(
    private fs: AngularFirestore,
    private errorHandler: GlobalErrorHandler,
    private format: FormatService
  ) {}

  initializeChat(chat: Chat) {
    this.chat.next(chat);
  }

  // Sends the content of the input bar as a new message to the database
  // returns the time of the message
  sendMessage(msgToSend: string): Observable<Date> {
    this.sendingMessage.next(true);

    const messageTime = new Date(); // this MUST be the same date sent to db as is checked below

    return combineLatest([
      this.errorHandler.getCurrentUser$().pipe(FilterFalsy()),
      this.chat$.pipe(FilterFalsy()),
    ]).pipe(
      take(1),
      switchMap(([user, chat]) =>
        defer(() =>
          this.fs
            .collection("chats")
            .doc(chat.id)
            .collection("messages")
            .doc()
            .set(this.databaseMsg(user.uid, chat.recipient.uid, msgToSend, messageTime))
        ).pipe(
          this.errorHandler.convertErrors("firestore"),
          this.errorHandler.handleErrors()
        )
      ),
      mapTo(messageTime),
      this.errorHandler.handleErrors(),
      finalize(() => this.sendingMessage.next(false))
    );
  }

  listenToMoreMessages() {
    const uid$ = this.errorHandler.getCurrentUser$().pipe(
      FilterFalsy(),
      map((u) => u.uid),
      take(1)
    );
    const chatid$ = this.chat$.pipe(
      FilterFalsy(),
      map((c) => c.id),
      take(1)
    );
    const currentMsgCount$ = this.messages$.pipe(
      map((msgs) => msgs.length),
      take(1)
    );

    const snapshotChanges$ = (uid, chatid: string, newMsgCount: number) =>
      this.fs
        .collection("chats")
        .doc(chatid)
        .collection<messageFromDatabase>("messages", (ref) =>
          ref
            .where("uids", "array-contains", uid)
            .orderBy("time", "desc")
            .limit(newMsgCount)
        )
        .snapshotChanges();

    return combineLatest([uid$, chatid$, currentMsgCount$]).pipe(
      switchMap(([uid, chatid, currMsgCount]) =>
        snapshotChanges$(uid, chatid, currMsgCount + this.MSG_BATCH_SIZE).pipe(
          map((s) => s.map((v) => v.payload.doc)),
          filter((docs) => docs.length >= currMsgCount && docs.length > 1), // because sometimes only 1 msg is obtained from snapshotChanges
          take(1),
          tap((docs) => this.checkForAllLoaded(currMsgCount, docs.length)),
          map((docs) => this.messages.next(this.docsToMsgs(docs))),
          this.errorHandler.convertErrors("firestore"),
          this.errorHandler.handleErrors()
        )
      )
    );
  }

  // for use in "listen to more messages"
  private checkForAllLoaded(currMsgCount: number, newMsgCount: number): void {
    if (currMsgCount === newMsgCount) this.allMessagesLoaded.next(true);
  }

  private docsToMsgs(docs: QueryDocumentSnapshot<messageFromDatabase>[]): Message[] {
    const messageMaps = docs.map((d) => ({ id: d.id, message: d.data() })).reverse();

    return this.format.messagesDatabaseToClass(messageMaps);
  }

  private databaseMsg(
    senderID: string,
    recipientID: string,
    content: string,
    time: Date
  ): messageFromDatabase {
    const message: messageFromDatabase = {
      uids: sortUIDs([senderID, recipientID]),
      senderID,
      time: Timestamp.fromDate(time),
      content,
    };

    return message;
  }
}
