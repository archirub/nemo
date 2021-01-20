import { message, messageReaction, messageState } from "@interfaces/index";

export class Message implements message {
  private _senderID: string;
  private _time: Date;
  private _content: string;
  private _reaction: messageReaction;
  private _state: messageState;
  private _seen: Boolean;

  constructor(
    senderID: string,
    time: Date,
    content: string,
    reaction: messageReaction,
    state: messageState,
    seen: Boolean
  ) {
    this.senderID = senderID;
    this.time = time;
    this.content = content;
    this.reaction = reaction;
    this.state = state;
    this.seen = seen;
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

  public get reaction(): messageReaction {
    return this._reaction;
  }
  public set reaction(value: messageReaction) {
    this._reaction = value;
  }

  public get state(): messageState {
    return this._state;
  }
  public set state(value: messageState) {
    this._state = value;
  }

  public get seen(): Boolean {
    return this._seen;
  }
  public set seen(value: Boolean) {
    this._seen = value;
  }
}