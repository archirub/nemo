import { Injectable } from "@angular/core";
import { Chat, Message } from "@classes/index";

import { Resolve, RouterStateSnapshot, ActivatedRouteSnapshot } from "@angular/router";

import { filter, map, mapTo, Observable, of, scan, switchMap, take, timer } from "rxjs";

import { ChatboardStore } from "@stores/index";
import { MSG_BATCH_SIZE } from "./messages.service";
import { AngularFirestore, QueryDocumentSnapshot } from "@angular/fire/firestore";
import { GlobalErrorHandler } from "@services/errors/global-error-handler.service";
import { FormatService } from "@services/format/format.service";
import { MessengerInitSharer } from "./messenger-init-sharer.service";
import { FilterFalsy } from "src/app/shared/functions/custom-rxjs";
import { messageFromDatabase } from "@interfaces/message.model";

@Injectable({ providedIn: "root" })
export class MessagesResolver implements Resolve<boolean> {
  constructor(
    private messengerInitSharer: MessengerInitSharer,
    private errorHandler: GlobalErrorHandler,
    private chatboardStore: ChatboardStore,
    private fs: AngularFirestore,
    private format: FormatService
  ) {}

  resolve(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    if (!route.paramMap.has("chatID")) return of(false);
    return this.initializeMessenger(route.paramMap.get("chatID"));
  }

  private initializeMessenger(chatid: string): Observable<true> {
    return this.chatboardStore.allChats$.pipe(
      map((chats) => chats?.[chatid]),
      filter((c) => !!c),
      take(1),
      switchMap((chat) => this.loadFirstMessages(chat)),
      mapTo(true)
    );
  }

  loadFirstMessages(chat: Chat) {
    const uid$ = this.errorHandler.getCurrentUser$().pipe(
      FilterFalsy(),
      map((u) => u.uid),
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

    return uid$.pipe(
      switchMap((uid) =>
        snapshotChanges$(uid, chat.id, MSG_BATCH_SIZE).pipe(
          map((s) => s.map((v) => v.payload.doc)),
          weirdTimerOperator(2, 500),
          take(1),
          map((docs) =>
            this.messengerInitSharer.storeVariables({
              chat,
              messages: this.docsToMsgs(docs),
            })
          ),
          this.errorHandler.convertErrors("firestore"),
          this.errorHandler.handleErrors()
        )
      )
    );
  }

  private docsToMsgs(docs: QueryDocumentSnapshot<messageFromDatabase>[]): Message[] {
    const messageMaps = docs.map((d) => ({ id: d.id, message: d.data() })).reverse();

    return this.format.messagesDatabaseToClass(messageMaps);
  }
}
