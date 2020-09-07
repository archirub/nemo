import { IDmap } from "../profile/profile.model";

interface userProfileSnipets {
  [userID: string]: { name: string; picture: string };
}

interface conversationExtraFields {
  userIDs: IDmap;
  lastMessage: string;
}

export type conversation = userProfileSnipets | conversationExtraFields;
