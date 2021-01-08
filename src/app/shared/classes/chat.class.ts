import { chat, userSnippet } from "@interfaces/index";
import { Message } from "@classes/index";

export class Chat implements chat {
  private _id: string;
  private _recipient: userSnippet;
  private _messages: Message[];
  private _batchVolume: number;
  private _lastInteracted: Date;
  private _latestChatInput: string;

  constructor(
    id: string,
    recipient: userSnippet,
    messages: Message[],
    batchVolume: number,
    lastInteracted: Date,
    latestChatInput: string
  ) {
    this.id = id;
    this.recipient = recipient;
    this.messages = messages;
    this.batchVolume = batchVolume;
    this.lastInteracted = lastInteracted;
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

  public get messages(): Message[] {
    return this._messages;
  }
  public set messages(value: Message[]) {
    this._messages = value;
  }

  public get batchVolume(): number {
    return this._batchVolume;
  }
  public set batchVolume(value: number) {
    this._batchVolume = value;
  }

  public get lastInteracted(): Date {
    return this._lastInteracted;
  }
  public set lastInteracted(value: Date) {
    this._lastInteracted = value;
  }
  public get latestChatInput(): string {
    return this._latestChatInput;
  }
  public set latestChatInput(value: string) {
    this._latestChatInput = value;
  }
}
