import { message } from "./message.model";
import { Message } from "@classes/index";

export interface userSnippet {
  uid: string;
  name: string;
  picture: string;
}
export interface conversationFromDatabase {
  uids: string[];
  userSnippets: userSnippet[];
  messages: message[];
  batchVolume: number;
  lastInteracted: Date;
}

export interface conversation {
  recipient: userSnippet;
  messages: Message[];
  batchVolume: number;
  lastInteracted: Date;
}
