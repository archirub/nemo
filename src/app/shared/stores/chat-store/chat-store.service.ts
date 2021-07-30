// to do now:
// - find the logic based on which you will fetch new chats in the activateStore method,
// - Link fetching more chats to how far scrolls goes
// - refactor the logic with which you watch the chats (you must watch all the chats here,
// not just those which you have fetched)

// might need two methods: one for just filling the store (fillStore), the other one for activating the whole
// chain of logic (activateStore), meaning filling the store if it is empty, or based on scroll, and activating watching the chats

import { Injectable } from "@angular/core";
import {
  Action,
  AngularFirestore,
  DocumentSnapshot,
  Query,
  QueryDocumentSnapshot,
} from "@angular/fire/firestore";

import {
  BehaviorSubject,
  concat,
  forkJoin,
  from,
  Observable,
  of,
  Subscription,
} from "rxjs";
import {
  catchError,
  concatMap,
  exhaustMap,
  map,
  take,
  withLatestFrom,
} from "rxjs/operators";

import { Chat, Message } from "@classes/index";
import {
  chatFromDatabase,
  messageFromDatabase,
  messageState,
  messageStateOptions,
} from "@interfaces/index";
import { FormatService } from "@services/index";
import { AngularFireAuth } from "@angular/fire/auth";
// import firebase from "firebase";

@Injectable({
  providedIn: "root",
})
export class ChatStore {
  private BATCH_SIZE = 10;

  private chats = new BehaviorSubject<Chat[]>([]);
  public readonly chats$ = this.chats.asObservable();

  private numberOfChatsToListen = new BehaviorSubject<number>(this.BATCH_SIZE);
  public numberOfChatsToListen$ = this.numberOfChatsToListen.asObservable();

  private chatSubscriptionsHandler: { [chatID: string]: Subscription } = {};
  private allChatsSubscription = new Subscription();
  private databaseListenerUnsub: () => void = null;

  constructor(
    private afAuth: AngularFireAuth,
    private firestore: AngularFirestore,
    private format: FormatService
  ) {}

  public activateStore(): Observable<any> {
    return this.numberOfChatsToListen$.pipe(
      concatMap((countWanted) => {
        return forkJoin([of(countWanted), this.afAuth.currentUser]);
      }), // only way it emits for some reason? Otherwise it blocks if I use "withLatestFrom"
      exhaustMap(([countWanted, user]) => {
        if (!user) throw "no user authenticated";
        return this.modifyDatabaseListener(countWanted, user.uid);
      }),
      catchError((error) => {
        if (error === "no user authenticated") {
          console.error("Unable to activate chat store; no user authenticated");
        }
        return of();
      })
    );
  }

  public incrementNumberOfChatsToListen(
    increment: number = this.BATCH_SIZE
  ): Observable<any> {
    return this.chats$.pipe(
      take(1),
      concatMap((chats) => {
        return forkJoin([of(chats.length), this.afAuth.currentUser]);
      }), // only way it emits for some reason? Otherwise it blocks if I use "withLatestFrom"

      exhaustMap(([currentCount, user]) => {
        if (!user) throw "no user authenticated";

        const countWanted = currentCount + increment;

        return this.modifyDatabaseListener(countWanted, user.uid);
      }),
      catchError((error) => {
        if (error === "no user authenticated") {
          console.error("Unable to add chats to chat store; no user authenticated");
        }
        return of();
      })
    );
  }

  public resetStore() {
    // TO DO
    // empty the store, remove the observables to the chat documents
  }

  private modifyDatabaseListener(count: number, uid: string): Observable<void> {
    return this.numberOfChatsToListen$.pipe(
      take(1),
      map((currentCount) => {
        // unsubscribes from previous subscription if there was one
        this.databaseListenerUnsub ? this.databaseListenerUnsub() : null;

        // update behaviorSubject
        // this.numberOfChatsToListen.next(count);

        const query = this.firestore.firestore
          .collection("chats")
          .where("uids", "array-contains", uid)
          .orderBy("lastInteracted", "desc")
          .limit(count);

        this.databaseListenerUnsub = query.onSnapshot({
          next: (snapshot) => {
            console.log("normal snapshot:", snapshot.docs);
            console.log("docChanges: ", snapshot.docChanges());
            return this.databaseToObservable(
              uid,
              snapshot.docs as QueryDocumentSnapshot<chatFromDatabase>[]
            );
          },
        });
      })
    );
  }

  private databaseToObservable(
    uid: string,
    docs: QueryDocumentSnapshot<chatFromDatabase>[]
  ): void {
    const chats: Chat[] = docs
      .map((doc) => {
        if (!doc.exists) return;
        return this.format.chatDatabaseToClass(uid, doc.id, doc.data());
      })
      .filter((chat) => chat);

    this.updateObservable(chats);
  }

  /** Updates the chat document on the database with the content
   * of what is stored in the Chats observable
   * DISADVANTAGE OF CURRENT FORMAT: have to update the whole message array, doesn't change just one message
   * That's bad if the message array stored locally is corrupted in some way, or if the user only wants to send
   * one message that didn't send, not all of them.
   */
  public async databaseUpdateMessages(chat: Chat): Promise<void> {
    if (!chat) return;

    const chats: Chat[] = this.chats.getValue();
    const chatIndex: number = this.getChatIndex(chats, chat);
    if (chatIndex === -1) return;

    const messages: messageFromDatabase[] = this.format.messagesClassToDatabase(
      chats[chatIndex].messages
    );
    const lastInteracted = chats[chatIndex].lastInteracted;

    const snapshot = await this.firestore.collection("chats").doc(chat.id).update({
      messages,
      lastInteracted,
    });
  }

  /** Adds the new message to the appropriate chat. Though update will be obtained from
   * the database regardless since we are listening to it. We must update locally to
   * make the app seem responsive regardless of the server's latency.
   */
  public localMessageAddition(message: Message, chat: Chat): void {
    if (!message || !chat) return;

    const chats: Chat[] = this.chats.getValue();
    const chatIndex: number = this.getChatIndex(chats, chat);
    if (chatIndex === -1) return;

    chats[chatIndex].messages.push(message);
    this.updateObservable(chats);
  }

  /** Removes message from chat */
  private localMessageRemoval(message: Message, chat: Chat): void {
    if (!message || !chat) return;

    const chats: Chat[] = this.chats.getValue();
    const chatIndex: number = this.getChatIndex(chats, chat);
    const messageIndex: number = this.getMessageIndex(chat, message);
    if (chatIndex === -1 || messageIndex === -1) return;

    chats[chatIndex].messages.splice(messageIndex, 1);

    this.updateObservable(chats);
  }

  /** Passes a new value to the chats observable.
   * Processes that need to occur every time this is done and every time happen here
   * a.k.a. refreshing the chat ordering according to lastInteracted property
   */
  private updateObservable(chats: Chat[]) {
    if (!chats) return;
    this.chats.next(this.sortChats(this.removeDuplicates(chats)));
  }

  /** Adds a new listener for updates/deletions to the chat doc with id chatID*/
  private newChatDocObserver(chatID: string, currentUserID: string): void {
    if (!chatID || !currentUserID) return;
    const listener = this.firestore
      .collection("chats")
      .doc(chatID)
      .snapshotChanges() as Observable<Action<DocumentSnapshot<chatFromDatabase>>>;
    const subscription: Subscription = listener.subscribe((ref) => {
      if (ref.payload.exists) {
        const chat: Chat = this.format.chatDatabaseToClass(
          currentUserID,
          chatID,
          ref.payload.data()
        );
        this.updateChat(chat);
      } else {
        console.error("Data of chat ref was empty:", ref);
      }
    });

    this.chatSubscriptionsHandler[chatID] = subscription;
    this.allChatsSubscription.add(subscription);
  }

  /** Stops listening on database chat document */
  private removeDatabaseObserver(chatID: string): void {
    if (
      chatID &&
      this.chatSubscriptionsHandler.hasOwnProperty(chatID) &&
      this.chatSubscriptionsHandler[chatID]
    ) {
      this.allChatsSubscription.remove(this.chatSubscriptionsHandler[chatID]);
      this.chatSubscriptionsHandler[chatID].unsubscribe();
      delete this.chatSubscriptionsHandler[chatID];
    }
  }

  /** Updates the chat corresponding to the provided chatSnapshot in the chats observable
   * If the latter doesn't exist, the chat is added to the chats observable.
   */
  private updateChat(chat: Chat): void {
    if (!chat) return;

    const chats: Chat[] = this.chats.getValue();
    const newChatIndex: number = this.getChatIndex(chats, chat);

    if (newChatIndex !== -1) {
      chats[newChatIndex] = chat;
    } else {
      chats.push(chat);
    }

    this.updateObservable(chats);
  }

  /** Updates the state of the message provided from chat provided */
  public updateMessageState(chat: Chat, message: Message, state: messageState) {
    if (!chat || !message) return console.error("Missing parameter(s)");
    if (!messageStateOptions.includes(state))
      return console.error("Unknown msg state:", state);

    const chats: Chat[] = this.chats.getValue();
    const chatIndex = this.getChatIndex(chats, chat);
    const messageIndex = this.getMessageIndex(chat, message);
    if (chatIndex === -1 || messageIndex === -1)
      return console.error(
        "Chat not found in chats or message not found in messages",
        chat,
        message
      );

    message.state = state;
    chat[messageIndex] = message;
    chats[chatIndex] = chat;

    this.updateObservable(chats);
  }

  /** Updates the lastInteracted property of the chat provided. */
  public updateLastInteracted(chat: Chat, lastInteracted: Date) {
    if (!chat || !lastInteracted) return;

    const chats: Chat[] = this.chats.getValue();
    const chatIndex = this.getChatIndex(chats, chat);
    if (chatIndex === -1) return;

    chats[chatIndex].lastInteracted = new Date(lastInteracted.getTime());

    this.updateObservable(chats);
  }

  /** Updates the property latestChatInput of the chat provided */
  public updateLatestChatInput(chat: Chat, input: string) {
    if (!chat || !input) return;

    const chats: Chat[] = this.chats.getValue();
    const chatIndex: number = this.getChatIndex(chats, chat);
    if (chatIndex === -1) return;

    chats[chatIndex].latestChatInput = input;
    this.updateObservable(chats);
  }

  /** Returns the index of the message provided within its chat
   * Finds message by assuming no two messages have the same content, same time and same sender
   */
  private getMessageIndex(chat: Chat, message: Message): number {
    if (!chat || !message) return;
    const index: number = chat.messages.findIndex(
      (_message) =>
        _message.content === message.content &&
        _message.senderID === message.senderID &&
        _message.time === message.time
    );
    if (index === -1) console.error("msg not found:", message, chat);
    return index;
  }

  /** Returns the index of the chat provided within chats observable */
  private getChatIndex(chats: Chat[], chat: Chat): number {
    if (!chats || !chat) return;

    const index: number = chats.findIndex((c) => {
      return c.id === chat.id;
    });
    if (index === -1) console.warn("chat not in chats:", chat);
    return index;
  }

  /** Sorts the chats so that lastly interacted chats are at the top of the array */
  private sortChats(chats: Chat[]): Chat[] {
    if (!chats) return;
    chats.sort(
      (chat1, chat2) => chat2.lastInteracted.getTime() - chat1.lastInteracted.getTime()
    );
    return chats;
  }

  private removeDuplicates(chats: Chat[]): Chat[] {
    if (!chats) return;

    return chats.filter(
      (chat, index, self) =>
        index === self.findIndex((c) => c.recipient.uid === chat.recipient.uid)
    );
  }

  //create function to set lastInteracted property to null for previous batchVolumes
  // when creating a new batchVolume, that way, they have no chances of being fetched
  // when we fetch the last-talked-to chatns (which we would do by doing
  // .collection().orderBy('lastInteracted','desc').limit(10).get())
  // ACTUALLY CREATE A FUNCTION THAT CALLS A CLOUD FUNCTION IF THE NUMBER OF MESSAGES OF THE CURRENT CHAT IS TOO HIGH
  // THAT CREATES A NEW CHAT DOCUMENT AND
  // MAKES THE LAST INTERACTED PROPERTY OF THE PREVIOUS (IF THERE ARE MULTIPLE AS WELL FOR ALL OF THEM)
  // EQUAL TO NULL
}
