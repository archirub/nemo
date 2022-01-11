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

export const messengerMotivationMessages = [
  "Go ahead, send that message. You've got to say something!",
  "Make sure you don't just say 'hey'!",
  "Time to set the vibe!",
  "Have fun with it, you can always try again!",
  "What is it they say... 'Speak from the heart'?",
];

// function that is essential for sorting the "uids" property of documents of the chats collection
// this is the only way that we can find a chat shared by two specific users
// (by using the query "where("uids", "==", sorteduidsarray)")
export function sortUIDs(uids: string[]): string[] {
  return uids.sort((a, b) => ("" + a).localeCompare(b));
}
