import { Injectable } from "@angular/core";
import { AngularFireAuth } from "@angular/fire/auth";
import { AngularFirestore, QueryDocumentSnapshot } from "@angular/fire/firestore";
import { BehaviorSubject, ReplaySubject, Observable, combineLatest, of } from "rxjs";

import { Chat } from "@classes/index";
import { FormatService } from "@services/index";
import {
  map,
  take,
  withLatestFrom,
  startWith,
  distinctUntilChanged,
  shareReplay,
  share,
} from "rxjs/operators";
import { chatFromDatabase, messageFromDatabase } from "@interfaces/index";

// the store has this weird shape because of the Firestore's onSnapshot function which
// takes an observer instead of simply being an observable. Because of that, I need
// to create observables myself for chats and for recent msgs, which are "chatChangesFromDatabase"
// and "recentMsgsFromDatabase" respectively.
// The activateStore function activates the onSnapshot functions, and subscribes to the Behavior
// and Replay Subjects.

// Firestore's onSnapshot function also forces us to have two recent-messages subjects
// to guarantee that we aren't using `this.recentMsgsFromDatabase.getValue()`, as I'm
// afraid that if we do so, two onSnapshot functions calling next on recentMsgsFromDatabase
// too close in time to one another could give a final next value to recentMsgsFromDatabase that
// doesn't include one of the two messages. If this isn't true or is extremely unlikely, then
// this is useless

type chatNature = "chat" | "match";
interface chatNatureMap {
  [chatID: string]: { chat: Chat; nature: chatNature };
}

@Injectable({
  providedIn: "root",
})
export class ChatboardStore {
  private allChats = new BehaviorSubject<chatNatureMap>({});

  public allChats$ = this.allChatsWithoutNatureProp();
  public chats$ = this.filterBasedOnNature("chat"); // chats where conversation hasn been initiated
  public matches$ = this.filterBasedOnNature("match"); // chats where conversation hasn't been initiated

  private chatsFromDatabase = new BehaviorSubject<
    QueryDocumentSnapshot<chatFromDatabase>[]
  >([]);
  private recentMsgsFromDatabase = new BehaviorSubject<{
    [chatID: string]: messageFromDatabase | "no message documents";
  }>({});
  private recentMsgToBeProcessed = new ReplaySubject<{
    chatID: string;
    data: messageFromDatabase | "no message documents";
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
      this.activateRecentMessagePreprocessing(),
      this.activateMsgAndChatDocumentsProcessing(),
    ]).pipe(share());
  }

  public resetStore() {
    this.chatDocsSub ? this.chatDocsSub() : null;

    Object.keys(this.recentMsgDocSubs).forEach((recipientID) => {
      const sub = this.recentMsgDocSubs[recipientID];
      sub ? sub() : null;
    });
  }

  private activateChatDocsListening(): Observable<void> {
    return this.afAuth.user.pipe(
      take(1),
      map((user) => {
        if (!user) throw "no user authenticated";

        this.chatDocsSub = this.firestore.firestore
          .collection("chats")
          .where("uids", "array-contains", user.uid)
          .onSnapshot({
            next: (snapshot) => {
              const docs = snapshot.docs;
              this.chatsFromDatabase.next(
                snapshot.docs as QueryDocumentSnapshot<chatFromDatabase>[]
              );
            },
          });
      })
    );
  }

  private activateRecentMessageListening(): Observable<void> {
    return this.chatsFromDatabase.asObservable().pipe(
      withLatestFrom(this.afAuth.user),
      map(([chatsFromDb, user]) => {
        if (!user) throw "no user authenticated";

        chatsFromDb.forEach((chatDoc) => {
          const recipientID = chatDoc
            .data()
            .uids.filter((id) => id !== (user as firebase.User).uid)[0];

          // assuming that the below being non-falsy means a sub is already active so no action needs to be taken
          if (this.recentMsgDocSubs[recipientID]) return;

          this.recentMsgDocSubs[recipientID] = chatDoc.ref
            .collection("messages")
            .orderBy("time", "desc")
            .limit(1)
            .onSnapshot({
              next: (snapshot) => {
                let data: messageFromDatabase | "no message documents";

                if (snapshot.empty) {
                  // this is a way of marking that the listening has activated, and that
                  // it has found that no message documents were present in the collection.
                  // This allows us to place the chat in the matches array.
                  // If we didn't do that, there is no way to tell whether a chat has no
                  // recent message because it hasn't been loaded from the database yet,
                  // or whether there is simply no recent message to be loaded
                  data = "no message documents";
                } else {
                  data = snapshot.docs[0].data() as messageFromDatabase;
                }
                const doc = { data, chatID: chatDoc.id };
                this.recentMsgToBeProcessed.next(doc);
              },
            });
        });
      })
    );
  }

  /**
   * Passes the recent messages from the ReplaySubject (which is pretty much
   * the queue of messages that still need to be processed), and adds them
   * to the msg map contained in the BehaviorSubject
   */
  private activateRecentMessagePreprocessing(): Observable<void> {
    return this.recentMsgToBeProcessed.pipe(
      withLatestFrom(this.recentMsgsFromDatabase),
      map(([msgToBeProcessed, currentMsgsMap]) => {
        currentMsgsMap[msgToBeProcessed.chatID] = msgToBeProcessed.data;
        this.recentMsgsFromDatabase.next(currentMsgsMap);
      })
    );
  }

  /**
   * Processes the arrival of new recent messages into the recentMsgsFromDatabase behaviorSubject
   */
  private activateMsgAndChatDocumentsProcessing(): Observable<void> {
    return combineLatest([this.recentMsgsFromDatabase, this.chatsFromDatabase]).pipe(
      withLatestFrom(combineLatest([this.afAuth.user, this.allChats])),
      map(([[recentMsgs, chats], [user, currentChats]]) => {
        if (!user) throw "no user authenticated";

        chats.forEach((chat) => {
          const correspondingMsg = recentMsgs[chat.id];

          // Important; makes sure only those for which we got a response from both
          // the chat documents and the recent msg documents are processed
          if (!correspondingMsg) return;

          // case where the chat should go in the match section
          if (correspondingMsg === "no message documents") {
            currentChats[chat.id] = {
              nature: "match",
              chat: this.format.chatDatabaseToClass(
                (user as firebase.User).uid,
                chat.id,
                chat.data(),
                null
              ),
            };
            // case where the chat should go in the chatboard section
          } else {
            currentChats[chat.id] = {
              nature: "chat",
              chat: this.format.chatDatabaseToClass(
                (user as firebase.User).uid,
                chat.id,
                chat.data(),
                this.format.messageDatabaseToClass(correspondingMsg)
              ),
            };
          }
        });

        this.allChats.next(currentChats);
      })
    );
  }

  private filterBasedOnNature(natureToKeep: chatNature): Observable<{
    [chatID: string]: Chat;
  }> {
    return this.allChats.pipe(
      map((allChats) => {
        const chats: { [chatID: string]: Chat } = {};
        Object.entries(allChats).forEach(([key, value]) => {
          if (value.nature === natureToKeep) {
            chats[key] = value.chat;
          }
        });
        return chats;
      }),
      distinctUntilChanged(
        (prev, curr) => Object.keys(prev).length === Object.keys(curr).length
      )
    );
  }

  private allChatsWithoutNatureProp(): Observable<{
    [chatID: string]: Chat;
  }> {
    return this.allChats.pipe(
      map((chats) => {
        const modifiedChatMap: { [chatID: string]: Chat } = {};

        Object.keys(chats).forEach((chatID) => {
          modifiedChatMap[chatID] = chats[chatID].chat;
        });

        return modifiedChatMap;
      })
    );
  }
}
