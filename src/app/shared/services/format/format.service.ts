import { Injectable } from "@angular/core";
import { AngularFireAuth } from "@angular/fire/auth";

import { Chat, Message } from "@classes/index";
import { chatFromDatabase, message, userSnippet } from "@interfaces/index";

interface Formatter {
  databaseToClass: Function;
  classToDatabase: Function;
}

@Injectable({
  providedIn: "root",
})
export class FormatService {
  constructor(private afAuth: AngularFireAuth) {}

  public chatDatabaseToClass(
    currentUserID: string,
    chatID: string,
    chatData: chatFromDatabase
  ): Chat {
    if (!currentUserID || !chatID || !chatData) return;

    const batchVolume: number = chatData.batchVolume;
    const lastInteracted: Date = chatData.lastInteracted;
    const userSnippets: userSnippet[] = chatData.userSnippets;
    const recipient: userSnippet = userSnippets.filter(
      (snippet) => snippet.uid !== currentUserID
    )[0];
    const dbMessages: message[] = chatData.messages.map((message) => {
      const _message = message as message;
      _message.state = "sent";
      return _message;
    });
    const messages: Message[] = this.messagesDatabaseToClass(dbMessages);

    return new Chat(
      chatID,
      recipient,
      messages,
      batchVolume,
      lastInteracted,
      null
    );
  }

  public messagesDatabaseToClass(messages: message[]): Message[] {
    if (!messages) return;

    return messages.map((msg) => {
      const content = msg.content;
      const reaction = msg.reaction;
      const senderID = msg.senderID;
      const time = msg.time;
      const seen = msg.seen;
      const state = msg.state;

      return new Message(senderID, time, content, reaction, seen, state);
    });
  }

  public messagesClassToDatabase(messages: Message[]): message[] {
    if (!messages) return;

    return messages.map((msg) => {
      return this.messageClassToDatabase(msg);
    });
  }

  private messageClassToDatabase(msg: Message): message {
    if (!msg) return;
    const content = msg.content;
    const reaction = msg.reaction;
    const senderID = msg.senderID;
    const time = msg.time;
    const seen = msg.seen;
    const state = msg.state;

    return { senderID, time, content, reaction, seen, state };
  }
}
