import { Injectable } from "@angular/core";
import { AngularFirestore } from "@angular/fire/firestore";

import { BehaviorSubject } from "rxjs";

import { conversation, message, userSnippet } from "@interfaces/index";
import { Conversation, Message } from "@classes/index";
import { AuthService } from "@services/auth/auth.service";

@Injectable({
  providedIn: "root",
})
export class ChatStore {
  private _conversations = new BehaviorSubject<Conversation[]>([]);
  public readonly conversations = this._conversations.asObservable();

  private _lastConversation = new BehaviorSubject<
    firebase.firestore.QueryDocumentSnapshot<firebase.firestore.DocumentData>
  >(null);
  public readonly lastConversation = this._lastConversation.asObservable();

  constructor(private auth: AuthService, private fs: AngularFirestore) {}

  public async getConversation(userID: string): Promise<conversation> {
    const myID: string = await this.auth.fetchUserID();
    const hisID = userID;

    return this._conversations.getValue().filter((conv) => {
      conv.recipient.uid === userID;
    })[0];
  }

  private async fetchConversations(amount: number): Promise<Conversation[]> {
    amount = amount ? +amount : 10;

    let query = this.fs.firestore
      .collection("conversations")
      .where("uids", "array-contains", this.auth.userID)
      .orderBy("lastInteracted", "desc")
      .limit(amount);

    const lastConvo = this._lastConversation.getValue();

    if (lastConvo) {
      query = query.startAfter(this._lastConversation.getValue());
    }

    const snapshot = await query.get();
    const documents = snapshot.docs;

    this._lastConversation.next(documents[documents.length - 1]);

    const conversations: Conversation[] = documents.map((doc) => {
      return this.conversationToClass(doc);
    });

    this._conversations.next(
      this._conversations.getValue().concat(conversations)
    );
    return conversations;
  }

  private conversationToClass(
    snapshot: firebase.firestore.QueryDocumentSnapshot<
      firebase.firestore.DocumentData
    >
  ): Conversation {
    if (!snapshot.exists) return;

    const batchVolume: number = snapshot.data().batchVolume;
    const lastInteracted: Date = snapshot.data().lastInteracted;

    const userSnippets: userSnippet[] = snapshot.data().userSnippets;
    const recipient: userSnippet = userSnippets.filter(
      (snippet) => snippet.uid !== this.auth.userID
    )[0];

    const dbMessages: message[] = snapshot.data().messages;
    const messages: Message[] = this.messagesToClass(dbMessages);

    return new Conversation(recipient, messages, batchVolume, lastInteracted);
  }

  private messagesToClass(messages: message[]): Message[] {
    if (!messages) return;

    return messages.map((msg) => {
      const content = msg.content;
      const reaction = msg.reaction;
      const senderID = msg.senderID;
      const time = msg.time;

      return new Message(senderID, time, content, reaction);
    });
  }

  public getConversationID(uid1: string, uid2: string): string {
    if (uid1 < uid2) {
      return uid1.concat(uid2);
    } else {
      return uid2.concat(uid1);
    }
  }

  //create function to set lastInteracted property to null for previous batchVolumes
  // when creating a new batchVolume, that way, they have no chances of being fetched
  // when we fetch the last-talked-to conversations (which we would do by doing
  // .collection().orderBy('lastInteracted','desc').limit(10).get())
}
