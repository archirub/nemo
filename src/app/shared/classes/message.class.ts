import { message, messageState } from "@interfaces/index";

export class Message implements message {
  private _messageID: string;
  private _senderID: string;
  private _time: Date;
  private _content: string;
  private _state: messageState;

  constructor(
    messageID: string,
    senderID: string,
    time: Date,
    content: string,
    state: messageState
  ) {
    this.messageID = messageID;
    this.senderID = senderID;
    this.time = time;
    this.content = content;
    this.state = state;
  }
  public get messageID(): string {
    return this._messageID;
  }
  public set messageID(value: string) {
    this._messageID = value;
  }

  public get senderID(): string {
    return this._senderID;
  }
  public set senderID(value: string) {
    this._senderID = value;
  }

  public get time(): Date {
    return this._time;
  }
  public set time(value: Date) {
    this._time = value;
  }

  public get content(): string {
    return this._content;
  }
  public set content(value: string) {
    this._content = value;
  }

  public get state(): messageState {
    return this._state;
  }
  public set state(value: messageState) {
    this._state = value;
  }
}
