import { Timestamp } from "@angular/fire/firestore";

export interface messageFromDatabase {
  uids: string[]; // necessary for checking it is own message in firestore security rules
  senderID: string;
  time: Timestamp;
  content: string;
  // reaction: messageReaction;
  // seen: boolean;
}

export interface message {
  messageID: string;
  senderID: string;
  time: Date;
  content: string;
  // reaction: messageReaction;
  state: messageState;
  // seen: boolean;
}

// map used when processing a message from database format to app format
export interface messageMap {
  id: string;
  message: messageFromDatabase;
}

export const messageReactionOptions = [
  "null",
  "love",
  "angry",
  "laugh",
  "cry",
  "thumbUp",
  "thumbDown",
] as const;
export type messageReaction = typeof messageReactionOptions[number];

export const messageStateOptions = ["sent", "sending", "failed"] as const;
export type messageState = typeof messageStateOptions[number];
