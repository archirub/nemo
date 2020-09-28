export interface message {
  senderID: string;
  time: Date;
  content: string;
  reaction: messageReaction;
}

export type messageReaction =
  | "null"
  | "love"
  | "angry"
  | "laugh"
  | "cry"
  | "thumbUp"
  | "thumbDown";
