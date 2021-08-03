import { Injectable } from "@angular/core";
import { AngularFireAuth } from "@angular/fire/auth";
import { AngularFirestore, QueryDocumentSnapshot } from "@angular/fire/firestore";
import { BehaviorSubject, ReplaySubject, Observable, combineLatest } from "rxjs";

import { Chat, Message } from "@classes/index";
import { FormatService } from "@services/index";
import { exhaustMap, map, scan, take, withLatestFrom, startWith } from "rxjs/operators";
import { chatFromDatabase, messageFromDatabase } from "@interfaces/index";

// the store has this weird shape because of the Firestore's onSnapshot function which
// takes an observer instead of simply being an observable. Because of that, I need
// to create observables myself for chats and for recent msgs, which are "chatChangesFromDatabase"
// and "recentMsgsFromDatabase" respectively.
// The activateStore function activates the onSnapshot functions, and subscribes to the Behavior
// and Replay Subjects.

@Injectable({
  providedIn: "root",
})
export class ChatboardStore {
  private chats = new BehaviorSubject<{ [chatID: string]: Chat }>({});
  public readonly chats$ = this.chats.asObservable();

  private chatChangesFromDatabase = new BehaviorSubject<
    QueryDocumentSnapshot<chatFromDatabase>[]
  >([]);
  private recentMsgFromDatabase = new ReplaySubject<{
    data: messageFromDatabase;
    chatID: string;
  }>();

  private chatDocsSub: () => void = null; // calling this function unsubscribes to the listener
  // object containing the listeners for recent messages.
  // has to be done with multiple listeners instead of one (like for the chat docs) as
  // firebase doesn't allow us to do it in one listener
  private recentMsgDocSubs: { [recipientID: string]: () => void } = {};

  constructor(
    private afAuth: AngularFireAuth,
    private firestore: AngularFirestore,
    private format: FormatService
  ) {}

  public activateStore() {
    return combineLatest([
      this.activateChatDocsListening(),
      this.activateRecentMessageListening(),
      this.afAuth.user.pipe(startWith("")),
      this.chatChangesFromDatabase,
      this.recentMsgFromDatabase,
    ]).pipe(
      withLatestFrom(this.chats$),
      map(([[_, __, user, chatChanges, recentMsgChange], currentChats]) => {
        if (!user) throw "no user authenticated";

        chatChanges.forEach((dbChat) => {
          let recentMessage: Message;
          if (recentMsgChange.chatID === dbChat.id) {
            recentMessage = this.format.messageDatabaseToClass(recentMsgChange.data);
          } else {
            recentMessage = currentChats?.[dbChat.id]?.recentMessage;
          }

          const chat = this.format.chatDatabaseToClass(
            (user as firebase.User).uid,
            dbChat.id,
            dbChat.data(),
            recentMessage
          );
          currentChats[dbChat.id] = chat;
        });

        this.chats.next(currentChats);
      })
    );
  }

  public resetStore() {
    this.chatDocsSub ? this.chatDocsSub() : null;

    Object.keys(this.recentMsgDocSubs).forEach((recipientID) => {
      const sub = this.recentMsgDocSubs[recipientID];
      sub ? sub() : null;
    });
  }

  activateChatDocsListening(): Observable<void> {
    return this.afAuth.user.pipe(
      take(1),
      map((user) => {
        if (!user) throw "no user authenticated";

        this.chatDocsSub = this.firestore.firestore
          .collection("chats")
          .where("uids", "array-contains", user.uid)
          .onSnapshot({
            next: (snapshot) => {
              const docs = snapshot.docChanges().map((s) => s.doc);
              this.chatChangesFromDatabase.next(
                docs as QueryDocumentSnapshot<chatFromDatabase>[]
              );
            },
          });
      })
    );
  }

  activateRecentMessageListening(): Observable<void> {
    return this.chatChangesFromDatabase.asObservable().pipe(
      withLatestFrom(this.afAuth.user.pipe(startWith(""))),
      map(([chatChanges, user]) => {
        if (!user) return;
        // if (!user) throw "no user authenticated";

        chatChanges.forEach((chatDoc) => {
          const recipientID = chatDoc
            .data()
            .uids.filter((id) => id !== (user as firebase.User).uid)[0];

          // assuming that being non-falsy means a sub is already active so no action needs to be taken
          if (this.recentMsgDocSubs[recipientID]) return;

          this.recentMsgDocSubs[recipientID] = chatDoc.ref
            .collection("messages")
            .orderBy("time", "desc")
            .limit(1)
            .onSnapshot({
              next: (snapshot) => {
                const data = snapshot.docs[0].data() as messageFromDatabase;
                const doc = { data, chatID: snapshot.docs[0].ref.parent.parent.id };
                this.recentMsgFromDatabase.next(doc);
              },
            });
        });
      })
    );
  }
}
