export interface message {
  senderID: string;
  time: Date;
  content: string;
  reaction: messageReaction;
  seen: boolean;
}

export type messageReaction =
  | "null"
  | "love"
  | "angry"
  | "laugh"
  | "cry"
  | "thumbUp"
  | "thumbDown";
