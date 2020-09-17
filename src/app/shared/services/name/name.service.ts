import { Injectable } from "@angular/core";

@Injectable({
  providedIn: "root",
})
export class NameService {
  public profileCollection: string;
  public matchCollection: string;
  public conversationCollection: string;
  public messageCollection: string;

  constructor() {
    this.profileCollection = "profiles";
    this.matchCollection = "matchData";
    this.conversationCollection = "conversations";
    this.messageCollection = "messages";
  }
}
