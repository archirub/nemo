import { AngularFirestore, QueryDocumentSnapshot } from "@angular/fire/firestore";

import { isEqual } from "lodash";
import { BehaviorSubject, combineLatest, defer, Observable, timer } from "rxjs";
import {
  delay,
  distinctUntilChanged,
  finalize,
  map,
  mapTo,
  scan,
  shareReplay,
  switchMap,
  switchMapTo,
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
import { FilterFalsy, Logger } from "src/app/shared/functions/custom-rxjs";
import { MessengerInitSharer } from "./messenger-init-sharer.service";

export const MSG_BATCH_SIZE: number = 15;

@Injectable() // don't get why this gives an error when it is removed even though it is provided in the component
export class MessagesService {
  private messages = new BehaviorSubject<Message[]>([]);
  private chat = new BehaviorSubject<Chat>(null);
  private allLoaded = new BehaviorSubject<boolean>(false);
  private sendingMessage = new BehaviorSubject<boolean>(false);

  // distinctUntilEqual here is super important (because of listenOnMoreMessages$ having as source observable messages$)
  // (and also because of handleShowLoading$)
  messages$ = this.messages.pipe(distinctUntilChanged((x, y) => isEqual(x, y)));
  chat$ = this.chat.pipe(distinctUntilChanged((x, y) => isEqual(x, y)));
  sendingMessage$ = this.sendingMessage.pipe(distinctUntilChanged());
  allLoaded$ = this.allLoaded.pipe(distinctUntilChanged());

  // emits once the first batch of messages has arrived.
  // this is for the moreMessagesLoadingHandler
  firstBatchArrived$ = this.messages$.pipe(
    map((msgs) => msgs.length > 0),
    distinctUntilChanged(),
    shareReplay()
  );

  constructor(
    private messengerInitSharer: MessengerInitSharer,
    private fs: AngularFirestore,
    private errorHandler: GlobalErrorHandler,
    private format: FormatService
  ) {
    this.initializeService();
  }

  initializeService() {
    const { chat, messages } = this.messengerInitSharer.extractVariables();
    this.chat.next(chat);
    this.messages.next(messages);
    console.log("initializeService called");
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
      switchMapTo(this.listenToMoreMessages(1)),
      Logger("worked"),
      mapTo(messageTime),
      this.errorHandler.handleErrors(),
      finalize(() => this.sendingMessage.next(false))
    );
  }

  listenToMoreMessages(count: number = MSG_BATCH_SIZE) {
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

    // this operator takes care of the fact that the snapshot changes is buggy and sometimes
    // first emits just one document instead of what the query asks for in the first place.
    // However, sometimes, it is normal that it sends just one document because it is because
    // there is actually just one message in the chat. Hence this operator basically counts
    // the emissions, and at the same time starts a timer, and it does a race between whether
    //
    // note that it is faulty and actually wouldn't work exactly if we required to wait
    // for more than two emissions (because the timer would restart on each new emission)
    const weirdTimerOperator =
      (thresholdCount: number, maxWait: number) =>
      <T>(source: Observable<T>) =>
        source.pipe(
          // to count emissions while retaining an instance of the latest value
          scan<T, { count: number; latestValue: T }>(
            (acc, value) => ({ count: acc.count + 1, latestValue: value }),
            {
              count: 0,
              latestValue: undefined,
            }
          ),
          // starts a timer
          switchMap((map) =>
            timer(map.count >= thresholdCount ? 0 : maxWait).pipe(mapTo(map.latestValue))
          )
        );

    return combineLatest([uid$, chatid$, currentMsgCount$]).pipe(
      switchMap(([uid, chatid, currMsgCount]) =>
        snapshotChanges$(uid, chatid, currMsgCount + count).pipe(
          map((s) => s.map((v) => v.payload.doc)),
          weirdTimerOperator(2, 500),
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
    if (currMsgCount >= newMsgCount) this.allLoaded.next(true);
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
