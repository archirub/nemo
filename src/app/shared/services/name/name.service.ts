import { Injectable } from "@angular/core";

@Injectable({
  providedIn: "root",
})
export class NameService {
  public profileCollection: string;
  public matchCollection: string;
  public chatCollection: string;
  public messageCollection: string;

  constructor() {
    this.profileCollection = "profiles";
    this.matchCollection = "matchData";
    this.chatCollection = "chats";
    this.messageCollection = "messages";
  }
}
