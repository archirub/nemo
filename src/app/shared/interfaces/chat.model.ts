import { Message } from "@classes/index";

export interface userSnippet {
  uid: string;
  name: string;
}
export interface chatFromDatabase {
  uids: string[];
  userSnippets: userSnippet[];
  // messages: messageFromDatabase[];
  // batchVolume: number;
  // lastInteracted: firebase.firestore.Timestamp;
}
export interface chat {
  id: string;
  recipient: userSnippet;
  recentMessage: Message;
  // messages: Message[];
  // batchVolume: number;
  // lastInteracted: Date;
}

// function that is essential for sorting the "uids" property of documents of the chats collection
// this is the only way that we can find a chat shared by two specific users
// (by using the query "where("uids", "==", sorteduidsarray)")
export function sortUIDs(uids: string[]): string[] {
  return uids.sort((a, b) => ("" + a).localeCompare(b));
}
