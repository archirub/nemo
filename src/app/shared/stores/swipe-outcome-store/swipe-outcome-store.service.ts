import { Injectable } from "@angular/core";

import { BehaviorSubject } from "rxjs";

import { Profile } from "@classes/index";

interface swipeOutcome {
  outcome: "yes" | "no" | "super";
  profile: Profile;
}
@Injectable({
  providedIn: "root",
})
export class SwipeOutcomeStore {
  private _latestOutcome: BehaviorSubject<swipeOutcome> = new BehaviorSubject<swipeOutcome>(
    null
  );
  private _yesProfiles: BehaviorSubject<Profile[]> = new BehaviorSubject<
    Profile[]
  >([]);
  private _noProfiles: BehaviorSubject<Profile[]> = new BehaviorSubject<
    Profile[]
  >([]);
  private _superProfiles: BehaviorSubject<Profile[]> = new BehaviorSubject<
    Profile[]
  >([]);

  public readonly latestOutcome = this._latestOutcome.asObservable();
  public readonly yesProfiles = this._yesProfiles.asObservable();
  public readonly noProfiles = this._noProfiles.asObservable();
  public readonly superProfiles = this._superProfiles.asObservable();

  public yesSwipe(profile: Profile) {
    this._latestOutcome.next({ outcome: "yes", profile: profile });
    this._yesProfiles.next(this._yesProfiles.getValue().concat(profile));
  }

  public noSwipe(profile: Profile) {
    this._latestOutcome.next({ outcome: "no", profile: profile });
    this._noProfiles.next(this._noProfiles.getValue().concat(profile));
  }

  public superSwipe(profile: Profile) {
    this._latestOutcome.next({ outcome: "super", profile: profile });
    this._superProfiles.next(this._superProfiles.getValue().concat(profile));
  }
}
