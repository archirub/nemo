import { Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";
import {
  conversation,
  message,
  conversationID,
} from "@interfaces/conversation";
import { AuthService } from "@services/auth/auth.service";

@Injectable({
  providedIn: "root",
})
export class ChatStoreService {
  constructor(private auth: AuthService) {}

  // - Nobody outside the Store should have access to the BehaviorSubject
  //   because it has the write rights
  // - Writing to state should be handled by specialized Store methods (ex: addchat, removechat, etc)
  // - Create one BehaviorSubject per store entity, for example if you have chatGroups
  private readonly _chats = new BehaviorSubject<conversation[]>([]);

  // Expose the observable$ part of the _chats subject (read only stream)
  readonly chats$ = this._chats.asObservable();

  // the getter will return the last value emitted in _chats subject
  private get chats(): conversation[] {
    return this._chats.getValue();
  }

  // assigning a value to this.chats will push it onto the observable
  // and down to all of its subsribers (ex: this.chats = [])
  private set chats(val: conversation[]) {
    this._chats.next(val);
  }

  public async getChat(userID: string): Promise<conversation> {
    const myID: string = await this.auth.fetchUserID();
    const hisID = userID;
    return this.chats.filter((chat) => {
      const containsIDs: Boolean =
        chat.userIDs[myID] === true && chat.userIDs[hisID] === true;
      return containsIDs;
    })[0];
  }

  private readonly _loadedMessages = new BehaviorSubject<message[]>([]);
  readonly loadedMessages$ = this._loadedMessages.asObservable();
}
