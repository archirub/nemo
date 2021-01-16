import { Injectable } from "@angular/core";
import {
  Action,
  AngularFirestore,
  DocumentSnapshot,
} from "@angular/fire/firestore";

import { BehaviorSubject, Observable, Subscription } from "rxjs";

import { Chat, Message } from "@classes/index";
import {
  chatFromDatabase,
  messageFromDatabase,
  messageState,
  messageStateOptions,
} from "@interfaces/index";
import { FormatService } from "@services/index";

@Injectable({
  providedIn: "root",
})
export class ChatStore {
  private chatSubscriptionsHandler: { [chatID: string]: Subscription };
  private allChatsSubscription: Subscription;
  private _chats: BehaviorSubject<Chat[]>;
  public readonly chats: Observable<Chat[]>;

  constructor(private fs: AngularFirestore, private format: FormatService) {
    this.allChatsSubscription = new Subscription();
    this.chatSubscriptionsHandler = {};
    this._chats = new BehaviorSubject<Chat[]>([]);
    this.chats = this._chats.asObservable();
  }

  /** Initialisse the store
   * returns uid so that store initializations can be chained
   */
  public async initializeStore(uid: string): Promise<string> {
    if (!uid) {
      console.error("No uid provided: chatStore init failed");
      return;
    }
    await this.fetchChats(uid);
    await Promise.all([
      this.startChatDocObservers(uid),
      this.startDocumentCreationDeletionObserver(uid),
    ]);

    console.log("ChatStore initialized.");
    return uid;
  }

  /** fetches all the chats for the authenticated user */
  public async fetchChats(uid: string): Promise<Chat[]> {
    if (!uid) {
      console.error("No uid provided");
      return;
    }

    const query = this.fs.firestore
      .collection("chats")
      .where("uids", "array-contains", uid)
      .orderBy("lastInteracted", "desc");
    const snapshot = await query.get();
    const documents = snapshot.docs;
    const chats: Chat[] = documents
      .map((doc) => {
        if (!doc.exists) return;
        return this.format.chatDatabaseToClass(
          uid,
          doc.id,
          doc.data() as chatFromDatabase
        );
      })
      .filter((chat) => chat);
    this.updateObservable(chats);
    return chats;
  }

  /** Initialises listening in on updates from the user's chats */
  private async startChatDocObservers(uid: string): Promise<void> {
    if (!uid) return console.error("No uid provided");

    this._chats
      .getValue()
      .map((chat) => chat.id)
      .forEach((chatID) => {
        if (
          this.chatSubscriptionsHandler.hasOwnProperty(chatID) &&
          this.chatSubscriptionsHandler[chatID]
        )
          return;
        this.newChatDocObserver(chatID, uid);
      });
  }

  /** Subscribes to the user's chat documents and listens in on the
   * creation of new document to start listening to them. */
  private async startDocumentCreationDeletionObserver(
    uid: string
  ): Promise<void> {
    if (!uid) return console.error("No uid provided");
    const listener = this.fs
      .collection("chats", (ref) => ref.where("uids", "array-contains", uid))
      .snapshotChanges();
    const subscription: Subscription = listener.subscribe((refs) => {
      refs
        .filter((ref) => ref.type !== "modified")
        .forEach((ref) => {
          if (ref.payload.doc.exists) {
            if (ref.type === "added") {
              this.newChatDocObserver(ref.payload.doc.id, uid);
            } else if (ref.type === "removed") {
              this.removeDatabaseObserver(ref.payload.doc.id);
            } else {
              console.error("Unhandled DocumentChangeAction type: ", ref.type);
            }
          }
        });
    });
    this.chatSubscriptionsHandler["chatCreation"] = subscription;
    this.allChatsSubscription.add(subscription);
  }

  /** Updates the chat document on the database with the content
   * of what is stored in the Chats observable
   * DISADVANTAGE OF CURRENT FORMAT: have to update the whole message array, doesn't change just one message
   * That's bad if the message array stored locally is corrupted in some way, or if the user only wants to send
   * one message that didn't send, not all of them.
   */
  public async databaseUpdateMessages(chat: Chat): Promise<void> {
    if (!chat) return;

    const chats: Chat[] = this._chats.getValue();
    const chatIndex: number = this.getChatIndex(chats, chat);
    const messages: messageFromDatabase[] = this.format.messagesClassToDatabase(
      chats[chatIndex].messages
    );
    const lastInteracted = chats[chatIndex].lastInteracted;

    const snapshot = await this.fs.collection("chats").doc(chat.id).update({
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

    const chats: Chat[] = this._chats.getValue();
    const chatIndex: number = this.getChatIndex(chats, chat);

    if (chatIndex !== -1) {
      chats[chatIndex].messages.push(message);
      this.updateObservable(chats);
    }
  }

  /** Removes message from chat */
  private localMessageRemoval(message: Message, chat: Chat): void {
    if (!message || !chat) return;

    const chats: Chat[] = this._chats.getValue();
    const chatIndex: number = this.getChatIndex(chats, chat);
    const messageIndex: number = this.getMessageIndex(chat, message);

    chats[chatIndex].messages.splice(messageIndex, 1);

    this.updateObservable(chats);
  }

  /** Passes a new value to the chats observable.
   * Processes that need to occur every time this is done and every time happen here
   * a.k.a. refreshing the chat ordering according to lastInteracted property
   */
  private updateObservable(chats: Chat[]) {
    if (!chats) return;
    this.refreshChatOrder(chats);
    this._chats.next(chats);
  }

  /** Adds a new listener for updates/deletions to the chat doc with id chatID*/
  private newChatDocObserver(chatID: string, currentUserID: string): void {
    if (!chatID || !currentUserID) return;
    const listener = this.fs
      .collection("chats")
      .doc(chatID)
      .snapshotChanges() as Observable<
      Action<DocumentSnapshot<chatFromDatabase>>
    >;
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

    const chats: Chat[] = this._chats.getValue();
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

    const chats: Chat[] = this._chats.getValue();
    const chatIndex = this.getChatIndex(chats, chat);
    const messageIndex = this.getMessageIndex(chat, message);

    message.state = state;
    chat[messageIndex] = message;
    chats[chatIndex] = chat;

    this.updateObservable(chats);
  }

  /** Updates the lastInteracted property of the chat provided. */
  public updateLastInteracted(chat: Chat, lastInteracted: Date) {
    if (!chat || !lastInteracted) return;

    const chats: Chat[] = this._chats.getValue();
    const chatIndex = this.getChatIndex(chats, chat);

    chats[chatIndex].lastInteracted = new Date(lastInteracted.getTime());

    this.updateObservable(chats);
  }

  /** Updates the property latestChatInput of the chat provided */
  public updateLatestChatInput(chat: Chat, input: string) {
    if (!chat || !input) return;

    const chats: Chat[] = this._chats.getValue();
    const chatIndex: number = this.getChatIndex(chats, chat);

    if (chatIndex !== -1) {
      chats[chatIndex].latestChatInput = input;
      this.updateObservable(chats);
    } else {
      console.error("Chat not found");
    }
  }

  /** Sorts the chats so that lastly interacted chats are at the top of the array */
  private refreshChatOrder(chats: Chat[]): Chat[] {
    if (!chats) return;
    chats.sort(
      (chat1, chat2) =>
        chat2.lastInteracted.getTime() - chat1.lastInteracted.getTime()
    );
    return chats;
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

    const index: number = chats.findIndex(
      (c) => c.id === chat.id && c.batchVolume === chat.batchVolume
    );
    if (index === -1) console.error("chat not found:", chat);
    return index;
  }

  //create function to set lastInteracted property to null for previous batchVolumes
  // when creating a new batchVolume, that way, they have no chances of being fetched
  // when we fetch the last-talked-to chatns (which we would do by doing
  // .collection().orderBy('lastInteracted','desc').limit(10).get())
}
