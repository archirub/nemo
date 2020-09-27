import { IDmap } from "./shared.model";

interface userProfileSnipets {
  [userID: string]: { name: string; picture: string };
}

interface conversationExtraFields {
  userIDs: IDmap;
  lastMessage: string;
}

export type conversation = userProfileSnipets | conversationExtraFields;

export type conversationID = string;
