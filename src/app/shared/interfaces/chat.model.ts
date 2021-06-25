import { messageFromDatabase } from "./message.model";
import { Message } from "@classes/index";

export interface userSnippet {
  uid: string;
  name: string;
}
export interface chatFromDatabase {
  uids: string[];
  userSnippets: userSnippet[];
  messages: messageFromDatabase[];
  batchVolume: number;
  lastInteracted: firebase.firestore.Timestamp;
}

export interface chat {
  id: string;
  recipient: userSnippet;
  messages: Message[];
  batchVolume: number;
  lastInteracted: Date;
}
