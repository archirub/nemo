import { Injectable } from "@angular/core";
import {
  Action,
  AngularFirestore,
  DocumentSnapshot,
} from "@angular/fire/firestore";
import { AngularFireAuth } from "@angular/fire/auth";
import { BehaviorSubject, Observable, Subscription } from "rxjs";

import { AuthService } from "@services/auth/auth.service";
import { Chat, Message } from "@classes/index";
import { chatFromDatabase, message, userSnippet } from "@interfaces/index";

@Injectable({
  providedIn: "root",
})
export class ChatStore {
  private chatSubscriptionsHandler: { [chatID: string]: Subscription };
  private allChatsSubscription: Subscription;
  private _chats: BehaviorSubject<Chat[]>;
  public readonly chats: Observable<Chat[]>;

  constructor(
    private auth: AuthService,
    private fs: AngularFirestore,
    private afAuth: AngularFireAuth
  ) {
    this.allChatsSubscription = new Subscription();
    this.chatSubscriptionsHandler = {};
    this._chats = new BehaviorSubject<Chat[]>([]);
    this.chats = this._chats.asObservable();
  }

  public async initializeStore(): Promise<void> {
    await this.fetchChats();
    this.startDatabaseObservers();
    await this.startDocumentCreationDeletionObserver();
  }

  /** fetches all the chats for the authenticated user */
  private async fetchChats(): Promise<Chat[]> {
    const user = await this.afAuth.currentUser;
    if (user) {
      let query = this.fs.firestore
        .collection("chats")
        .where("uids", "array-contains", user.uid)
        .orderBy("lastInteracted", "desc");
      const snapshot = await query.get();
      const documents = snapshot.docs;
      const chats: Chat[] = documents
        .map((doc) => {
          if (!doc.exists) return;
          return this.dbFormatToClass_chat(doc);
        })
        .filter((chat) => chat);
      this._chats.next(chats);
      return chats;
    } else {
      console.error("Unable to fetch chat documents, user isn't logged in.");
    }
  }

  /** Initialises listening in on updates from the user's chats */
  private startDatabaseObservers(): void {
    this._chats
      .getValue()
      .map((chat) => chat.id)
      .forEach((id) => {
        if (
          this.chatSubscriptionsHandler.hasOwnProperty(id) &&
          this.chatSubscriptionsHandler[id]
        )
          return;
        this.newDatabaseObserver(id);
      });
  }

  /** Subscribes to the user's chat documents and listens in on the
   * creation of new document to start listening to them. */
  private async startDocumentCreationDeletionObserver(): Promise<void> {
    const user = await this.afAuth.currentUser;
    if (user) {
      const listener = this.fs
        .collection("chats", (ref) =>
          ref.where("uids", "array-contains", user.uid)
        )
        .snapshotChanges();
      const subscription: Subscription = listener.subscribe((refs) => {
        refs
          .filter((ref) => ref.type !== "modified")
          .forEach((ref) => {
            if (ref.payload.doc.exists) {
              if (ref.type === "added") {
                this.newDatabaseObserver(ref.payload.doc.id);
              } else if (ref.type === "removed") {
                this.removeDatabaseObserver(ref.payload.doc.id);
              } else {
                console.error(
                  "Unhandled DocumentChangeAction type: ",
                  ref.type
                );
              }
            }
          });
      });
      this.chatSubscriptionsHandler["chatCreation"] = subscription;
      this.allChatsSubscription.add(subscription);
    } else {
      console.error(
        "Can't listen on chat doc creation as no user is logged in."
      );
    }
  }

  /** Updates the chat document on the database */
  private async databaseMessageUpdate(
    message: Message,
    chat: Chat
  ): Promise<void> {
    if (!message || !chat) return;

    const currentMessages: message[] = this.classToDbFormat_messages(
      chat.messages
    );
    const newMessage: message = this.classToDbFormat_message(message);

    currentMessages.push(newMessage);

    const snapshot = await this.fs.collection("chats").doc(chat.id).update({
      messages: currentMessages,
    });
  }

  /** Adds the new message to the appropriate chat. Though update will be obtained from
   * the database regardless since we are listening to it. We must update locally to
   * make the app seem responsive regardless of the server's latency.
   */
  private localMessageAddition(newMessage: Message, chat: Chat): void {
    if (!newMessage || !chat) return;

    let chats: Chat[] = this._chats.getValue();

    // Finding index of chat to update
    const chatIndex: number = chats.map((_chat) => _chat.id).indexOf(chat.id);

    if (chatIndex !== -1) {
      let targetChat: Chat = chats[chatIndex];

      // Updating message array
      targetChat.messages.push(newMessage);

      // Replacing old chat object with new chat object
      chats.splice(chatIndex, 1, targetChat);

      this._chats.next(chats);
    }
  }

  /** Removes message from chat */
  private localMessageRemoval(message: Message, chat: Chat): void {
    if (!message || !chat) return;

    let chats: Chat[] = this._chats.getValue();

    // Finding index of chat to update
    const chatIndex: number = chats.map((_chat) => _chat.id).indexOf(chat.id);

    if (chatIndex !== -1) {
      let targetChat: Chat = chats[chatIndex];
      // Finding index of message to remove
      const messageIndex: number = targetChat.messages.indexOf(message);

      if (messageIndex !== -1) {
        // removing message
        targetChat.messages.splice(messageIndex, 1);
        chats.splice(chatIndex, 1, targetChat);
        this._chats.next(chats);
      }
    }
  }

  /** Adds a new listener for updates/deletions to the chat doc with id chatID*/
  private newDatabaseObserver(chatID: string): void {
    const listener = this.fs
      .collection("chats")
      .doc(chatID)
      .snapshotChanges() as Observable<
      Action<DocumentSnapshot<chatFromDatabase>>
    >;
    const subscription: Subscription = listener.subscribe((ref) => {
      if (ref.payload.exists) {
        this.updateChat(ref.payload);
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
  private updateChat(
    chatSnapshot: firebase.firestore.QueryDocumentSnapshot<firebase.firestore.DocumentData>
  ): void {
    if (!chatSnapshot.exists) return;

    const newChat: Chat = this.dbFormatToClass_chat(chatSnapshot);

    const chatsObject: Chat[] = this._chats.getValue();

    const newChatIndex: number = chatsObject
      .map((chat) => chat.id)
      .indexOf(newChat.id);

    if (newChatIndex !== -1) {
      chatsObject[newChatIndex] = newChat;
    } else {
      chatsObject.push(newChat);
    }
    this._chats.next(chatsObject);
  }

  private dbFormatToClass_chat(
    snapshot: firebase.firestore.QueryDocumentSnapshot<firebase.firestore.DocumentData>
  ): Chat {
    if (!snapshot.exists) return;
    const id: string = snapshot.id;
    const batchVolume: number = snapshot.data().batchVolume;
    const lastInteracted: Date = snapshot.data().lastInteracted;

    const userSnippets: userSnippet[] = snapshot.data().userSnippets;

    const recipient: userSnippet = userSnippets.filter(
      (snippet) => snippet.uid !== this.auth.userID
    )[0];

    const dbMessages: message[] = snapshot.data().messages;
    const messages: Message[] = this.dbFormatToClass_messages(dbMessages);

    return new Chat(id, recipient, messages, batchVolume, lastInteracted);
  }

  private dbFormatToClass_messages(messages: message[]): Message[] {
    if (!messages) return;

    return messages.map((msg) => {
      const content = msg.content;
      const reaction = msg.reaction;
      const senderID = msg.senderID;
      const time = msg.time;
      const seen = msg.seen;

      return new Message(senderID, time, content, reaction, seen);
    });
  }

  private classToDbFormat_message(msg: Message): message {
    if (!msg) return;
    const content = msg.content;
    const reaction = msg.reaction;
    const senderID = msg.senderID;
    const time = msg.time;
    const seen = msg.seen;

    return new Message(senderID, time, content, reaction, seen);
  }

  private classToDbFormat_messages(messages: Message[]): message[] {
    if (!messages) return;

    return messages.map((msg) => {
      return this.classToDbFormat_message(msg);
    });
  }

  //create function to set lastInteracted property to null for previous batchVolumes
  // when creating a new batchVolume, that way, they have no chances of being fetched
  // when we fetch the last-talked-to chatns (which we would do by doing
  // .collection().orderBy('lastInteracted','desc').limit(10).get())
}
