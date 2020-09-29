import { Injectable } from "@angular/core";
import {
  AngularFirestore,
  DocumentChangeAction,
  DocumentData,
  QueryDocumentSnapshot,
} from "@angular/fire/firestore";

import { BehaviorSubject, Observable, Subscription } from "rxjs";

import { chat, message, userSnippet } from "@interfaces/index";
import { Chat, Message } from "@classes/index";
import { AuthService } from "@services/auth/auth.service";

@Injectable({
  providedIn: "root",
})
export class ChatStore {
  private _chats = new BehaviorSubject<Chat[]>([]);
  public readonly chats = this._chats.asObservable();

  private _lastChat = new BehaviorSubject<QueryDocumentSnapshot<DocumentData>>(
    null
  );
  public readonly lastChat = this._lastChat.asObservable();

  constructor(private auth: AuthService, private fs: AngularFirestore) {}

  // public async getChat(userID: string): Promise<chat> {
  //   const myID: string = await this.auth.fetchUserID();
  //   const hisID = userID;

  //   return this._chats.getValue().filter((chat) => {
  //     chat.recipient.uid === userID;
  //   })[0];
  // }

  /** fetches all the chats for the authenticated user */
  public async fetchChats(amount: number): Promise<Chat[]> {
    amount = amount ? +amount : 10;

    let query = this.fs.firestore
      .collection("chats")
      .where("uids", "array-contains", this.auth.userID)
      .orderBy("lastInteracted", "desc")
      .limit(amount);

    const lastConvo = this._lastChat.getValue();

    if (lastConvo) {
      query = query.startAfter(lastConvo);
    }

    const snapshot = await query.get();
    const documents = snapshot.docs;

    this._lastChat.next(documents[documents.length - 1]);

    const chats: Chat[] = documents.map((doc) => {
      return this.dbFormatToClass_chat(doc);
    });

    this._chats.next(this._chats.getValue().concat(chats));
    return chats;
  }

  private dbFormatToClass_chat(
    snapshot: firebase.firestore.QueryDocumentSnapshot<
      firebase.firestore.DocumentData
    >
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

  public async sendMessageToDatabase(
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

  public updateMessages(updatedMessages: Message[], chat: Chat): void {
    let chats: Chat[] = this._chats.getValue();

    // Finding index of chat to update
    const targetIndex: number = chats.map((_chat) => _chat.id).indexOf(chat.id);
    let targetChat: Chat = chats[targetIndex];

    // Updating message array
    targetChat.messages = updatedMessages;

    // Replacing old chat object with new chat object
    chats.splice(targetIndex, 1, targetChat);

    this._chats.next(chats);
  }

  // public getChatID(uid1: string, uid2: string): string {
  //   if (uid1 < uid2) {
  //     return uid1.concat(uid2);
  //   } else {
  //     return uid2.concat(uid1);
  //   }
  // }

  //create function to set lastInteracted property to null for previous batchVolumes
  // when creating a new batchVolume, that way, they have no chances of being fetched
  // when we fetch the last-talked-to chats (which we would do by doing
  // .collection().orderBy('lastInteracted','desc').limit(10).get())
}
