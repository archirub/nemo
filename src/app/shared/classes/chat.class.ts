import { chat, userSnippet } from "@interfaces/index";
import { Message } from "@classes/index";

export class Chat implements chat {
  private _id: string;
  private _recipient: userSnippet;
  private _recentMessage: Message;
  private _latestChatInput: string;

  constructor(
    id: string,
    recipient: userSnippet,
    recentMessage: Message,
    latestChatInput: string
  ) {
    this.id = id;
    this.recipient = recipient;
    this.recentMessage = recentMessage;
    this.latestChatInput = latestChatInput;
  }

  public get id(): string {
    return this._id;
  }
  public set id(value: string) {
    this._id = value;
  }

  public get recipient(): userSnippet {
    return this._recipient;
  }
  public set recipient(value: userSnippet) {
    this._recipient = value;
  }

  public get recentMessage(): Message {
    return this._recentMessage;
  }
  public set recentMessage(value: Message) {
    this._recentMessage = value;
  }

  public get latestChatInput(): string {
    return this._latestChatInput;
  }
  public set latestChatInput(value: string) {
    this._latestChatInput = value;
  }
}
