export interface messageFromDatabase {
  senderID: string;
  time: Date;
  content: string;
  reaction: messageReaction;
  seen: boolean;
}

export interface message {
  senderID: string;
  time: Date;
  content: string;
  reaction: messageReaction;
  seen: boolean;
  state: messageState;
}

export type messageReaction =
  | "null"
  | "love"
  | "angry"
  | "laugh"
  | "cry"
  | "thumbUp"
  | "thumbDown";

export type messageState = "sent" | "sending" | "failed";
