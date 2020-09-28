import { message, messageReaction } from "@interfaces/index";

export class Message implements message {
  private _senderID: string;
  private _time: Date;
  private _content: string;
  private _reaction: messageReaction;

  constructor(
    senderID: string,
    time: Date,
    content: string,
    reaction: messageReaction
  ) {
    (this.senderID = senderID),
      (this.time = time),
      (this.content = content),
      (this.reaction = reaction);
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
}
