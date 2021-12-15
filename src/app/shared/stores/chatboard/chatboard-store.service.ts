import { Injectable } from "@angular/core";
import { AngularFireAuth } from "@angular/fire/auth";
import { AngularFireFunctions } from "@angular/fire/functions";
import {
  AngularFirestore,
  QueryDocumentSnapshot,
  DocumentChangeAction,
} from "@angular/fire/firestore";

import {
  BehaviorSubject,
  ReplaySubject,
  Observable,
  combineLatest,
  Subject,
  forkJoin,
} from "rxjs";
import {
  map,
  withLatestFrom,
  distinctUntilChanged,
  share,
  first,
  tap,
  switchMap,
} from "rxjs/operators";

import { FormatService } from "@services/format/format.service";

import { Chat } from "@classes/index";
import {
  chatDeletionByUserRequest,
  chatFromDatabase,
  messageFromDatabase,
  messageMap,
  CHECK_AUTH_STATE,
  CustomError,
} from "@interfaces/index";
import { FirebaseUser } from "@interfaces/firebase.model";

import { GlobalErrorHandler } from "@services/errors/global-error-handler.service";

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
  // object containing the listeners for recent messages.
  // has to be done with multiple listeners instead of one (like for the chat docs) as
  // firebase doesn't allow us to do it in one listener
  private recentMsgDocSubs: { [recipientID: string]: () => void } = {};
  private chatDocsSub: () => void = null; // calling this function unsubscribes to the listener

  private chatsFromDatabase = new BehaviorSubject<
    QueryDocumentSnapshot<chatFromDatabase>[]
  >([]);

  private recentMsgsFromDatabase = new BehaviorSubject<{
    [chatID: string]: messageMap | "no message documents";
  }>({});

  private recentMsgToBeProcessed = new ReplaySubject<{
    chatID: string;
    data: messageMap | "no message documents";
  }>();

  private allChats = new BehaviorSubject<chatNatureMap>({});

  private hasNoChats = new Subject<boolean>();

  public allChats$ = this.allChatsWithoutNatureProp();
  public chats$ = this.filterBasedOnNature("chat");
  public matches$ = this.filterBasedOnNature("match");
  public hasNoChats$ = this.hasNoChats.asObservable().pipe(distinctUntilChanged());

  public isReady$ = combineLatest([this.allChats$, this.hasNoChats$]).pipe(
    map(
      ([chats, hasNoChats]) =>
        Object.values(chats).filter((c) => c).length > 0 || hasNoChats
    )
  );

  constructor(
    private afAuth: AngularFireAuth,
    private firestore: AngularFirestore,
    private afFunctions: AngularFireFunctions,

    private errorHandler: GlobalErrorHandler,
    private format: FormatService
  ) {}

  public activateStore$ = this.activateStore();

  private activateStore() {
    return combineLatest([
      this.activateChatDocsListening(),
      this.activateRecentMessageListening(),
      this.activateRecentMessagePreprocessing(),
      this.activateMsgAndChatDocumentsProcessing(),
    ]).pipe(share());
  }

  private activateChatDocsListening(): Observable<any> {
    return this.afAuth.user.pipe(
      tap((user) => {
        if (!user) throw new CustomError("local/check-auth-state", "local");
      }),
      first(),
      switchMap((user) =>
        (
          this.firestore
            .collection("chats", (ref) => ref.where("uids", "array-contains", user.uid))
            .snapshotChanges() as Observable<DocumentChangeAction<chatFromDatabase>[]>
        ).pipe(this.errorHandler.convertErrors("firestore"))
      ),
      tap((res) => {
        const docs = res.map((r) => r.payload.doc);

        this.hasNoChats.next(docs?.length < 1);

        this.chatsFromDatabase.next(docs);
      }),
      this.errorHandler.handleErrors()
    );
  }

  private activateRecentMessageListening(): Observable<void[]> {
    return this.chatsFromDatabase.asObservable().pipe(
      withLatestFrom(this.afAuth.user),
      tap(([chatsFromDb, user]) => {
        if (!user) throw new CustomError("local/check-auth-state", "local");
      }),
      switchMap(([chatsFromDb, user]) =>
        forkJoin(
          chatsFromDb.map((chatDoc) => {
            const recipientID = chatDoc.data().uids.filter((id) => id !== user.uid)[0];

            return (
              this.firestore
                .collection("chats")
                .doc(chatDoc.id)
                .collection("messages", (ref) =>
                  ref
                    // though useless wrt query content, necessary to pass security rules
                    // (because for queries security rules aren't checked against each doc, they're checked
                    // against the nature of the query)
                    .where("uids", "array-contains", user.uid)
                    .orderBy("time", "desc")
                    .limit(1)
                )
                .snapshotChanges() as Observable<
                DocumentChangeAction<messageFromDatabase>[]
              >
            ).pipe(
              map((res) => {
                const msgDoc = res?.[0]?.payload?.doc;
                let msgData: messageMap | "no message documents";

                // this is a way of marking that the listening has activated, and that
                // it has found that no message documents were present in the collection.
                // This allows us to place the chat in the matches array.
                // If we didn't do that, there is no way to tell whether a chat has no
                // recent message because it hasn't been loaded from the database yet,
                // or whether there is simply no recent message to be loaded
                if (msgDoc) {
                  msgData = {
                    id: msgDoc.id,
                    message: msgDoc.data(),
                  };
                } else {
                  msgData = "no message documents";
                }

                const msgMap = { data: msgData, chatID: chatDoc.id };
                this.recentMsgToBeProcessed.next(msgMap);
              }),
              this.errorHandler.convertErrors("firestore")
            );
          })
        )
      ),
      this.errorHandler.handleErrors()
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
        if (!user) throw new CustomError("local/check-auth-state", "local");

        chats.forEach((chat) => {
          const correspondingMsg = recentMsgs?.[chat.id];

          // Important; makes sure only those for which we got a response from both
          // the chat documents and the recent msg documents are processed
          if (!correspondingMsg) return;

          // case where the chat should go in the match section
          if (correspondingMsg === "no message documents") {
            currentChats[chat.id] = {
              nature: "match",
              chat: this.format.chatDatabaseToClass(
                (user as FirebaseUser).uid,
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
                (user as FirebaseUser).uid,
                chat.id,
                chat.data(),
                this.format.messageDatabaseToClass(correspondingMsg)
              ),
            };
          }
        });

        this.allChats.next(currentChats);
      }),
      this.errorHandler.handleErrors()
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

  public deleteChatOnDatabase(chatID: string) {
    const request: chatDeletionByUserRequest = { chatID };
    return this.afFunctions
      .httpsCallable("chatDeletionByUser")(request)
      .pipe(
        this.errorHandler.convertErrors("cloud-functions"),
        this.errorHandler.handleErrors()
      );
  }

  public deleteChatInStore(chatID: string) {
    return this.allChats.pipe(
      first(),
      tap((chats) => {
        if (chats[chatID]) {
          delete chats[chatID];
          this.allChats.next(chats);
        }
      })
    );
  }

  /**
   * returns false if user doesn't have chat with the provided user,
   * returns the chatID otherwise
   */
  public userHasChatWith(uid: string): Observable<false | string> {
    return this.allChats$.pipe(
      first(),
      map((chats) => {
        let theChatID: false | string = false;

        Object.entries(chats).forEach(([chatID, chat]) => {
          if (chat.recipient.uid === uid) {
            theChatID = chatID;
          }
        });

        return theChatID;
      })
    );
  }

  public resetStore() {
    console.log("resetting chatboard store", this.chatDocsSub);
    this.chatDocsSub ? this.chatDocsSub() : null;

    Object.keys(this.recentMsgDocSubs).forEach((recipientID) => {
      const sub = this.recentMsgDocSubs[recipientID];
      sub ? sub() : null;
    });
  }
}
