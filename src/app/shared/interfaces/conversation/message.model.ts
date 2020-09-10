export interface message {
  senderID: string;
  time: Date;
  content: string;
  reaction: messageReaction;
  status: messageStatus;
}

export type messageReaction =
  | "love"
  | "angry"
  | "laugh"
  | "cry"
  | "thumbUp"
  | "thumbDown";

export const MessageReaction: messageReaction[] = [
  "love",
  "angry",
  "laugh",
  "cry",
  "thumbUp",
  "thumbDown",
];

export interface messageStatus {
  sent: Boolean;
  received: Boolean;
  seen: Boolean;
}
