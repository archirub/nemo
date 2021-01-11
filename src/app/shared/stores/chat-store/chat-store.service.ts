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

  public async initializeStore(uid: string): Promise<void> {
    if (!uid) return console.error("No uid provided: chatStore init failed");
    await this.fetchChats(uid);
    await Promise.all([
      this.startChatDocObservers(uid),
      this.startDocumentCreationDeletionObserver(uid),
    ]);
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
    this._chats.next(chats);
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

    const currentMessages: messageFromDatabase[] = this.format.messagesClassToDatabase(
      chat.messages
    );
    const snapshot = await this.fs.collection("chats").doc(chat.id).update({
      messages: currentMessages,
    });
  }

  /** Adds the new message to the appropriate chat. Though update will be obtained from
   * the database regardless since we are listening to it. We must update locally to
   * make the app seem responsive regardless of the server's latency.
   */
  public localMessageAddition(newMessage: Message, chatID: string): void {
    if (!newMessage || !chatID) return;

    let chats: Chat[] = this._chats.getValue();

    // Finding index of chat to update
    const chatIndex: number = chats.map((_chat) => _chat.id).indexOf(chatID);

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
  private localMessageRemoval(message: Message, chatID: string): void {
    if (!message || !chatID) return;

    let chats: Chat[] = this._chats.getValue();

    // Finding index of chat to update
    const chatIndex: number = chats.map((_chat) => _chat.id).indexOf(chatID);

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
  private updateChat(newChat: Chat): void {
    if (!newChat) return;

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

  public updateMessageState(
    targetChat: Chat,
    targetMessage: Message,
    newState: messageState
  ) {
    if (!targetChat || !targetMessage || !newState) return;
    const chats: Chat[] = this._chats.getValue();

    // Assuming no two messages have the same content, same time and same sender
    const messageIndex: number = targetChat.messages.findIndex(
      (_message) =>
        _message.content === targetMessage.content &&
        _message.senderID === targetMessage.senderID &&
        _message.time === targetMessage.time
    );

    if (messageIndex !== -1) {
      targetMessage.state = newState;
      targetChat[messageIndex] = targetMessage;

      const chatIndex: number = chats
        .map((chat) => chat.id)
        .indexOf(targetChat.id);

      if (chatIndex !== -1) {
        chats[chatIndex] = targetChat;
        this._chats.next(chats);
      } else {
        console.error("Chat not found");
      }
    } else {
      console.error("Message not found");
    }
  }

  public updateLatestChatInput(targetChat: Chat, newInput: string) {
    if (!targetChat || !newInput) return;

    const chats: Chat[] = this._chats.getValue();

    const chatIndex: number = chats
      .map((chat) => chat.id)
      .indexOf(targetChat.id);
    if (chatIndex !== -1) {
      chats[chatIndex].latestChatInput = newInput;
      this._chats.next(chats);
    } else {
      console.error("Chat not found");
    }
  }

  //create function to set lastInteracted property to null for previous batchVolumes
  // when creating a new batchVolume, that way, they have no chances of being fetched
  // when we fetch the last-talked-to chatns (which we would do by doing
  // .collection().orderBy('lastInteracted','desc').limit(10).get())
}
