import { Injectable } from "@angular/core";

import { BehaviorSubject, Observable } from "rxjs";

import { profileSnapshot } from "@interfaces/profile";

interface swipeOutcome {
  outcome: "yes" | "no" | "super";
  profile: profileSnapshot;
}
@Injectable({
  providedIn: "root",
})
export class SwipeOutcomeStoreService {
  private _latestOutcome: BehaviorSubject<swipeOutcome> = new BehaviorSubject<
    swipeOutcome
  >(null);
  private _yesProfiles: BehaviorSubject<
    profileSnapshot[]
  > = new BehaviorSubject<profileSnapshot[]>([]);
  private _noProfiles: BehaviorSubject<profileSnapshot[]> = new BehaviorSubject<
    profileSnapshot[]
  >([]);
  private _superProfiles: BehaviorSubject<
    profileSnapshot[]
  > = new BehaviorSubject<profileSnapshot[]>([]);

  public readonly latestOutcome = this._latestOutcome.asObservable();
  public readonly yesProfiles = this._yesProfiles.asObservable();
  public readonly noProfiles = this._noProfiles.asObservable();
  public readonly superProfiles = this._superProfiles.asObservable();

  public yesSwipe(profile: profileSnapshot) {
    this._latestOutcome.next({ outcome: "yes", profile: profile });
    this._yesProfiles.next(this._yesProfiles.getValue().concat(profile));
  }

  public noSwipe(profile: profileSnapshot) {
    this._latestOutcome.next({ outcome: "no", profile: profile });
    this._noProfiles.next(this._noProfiles.getValue().concat(profile));
  }

  public superSwipe(profile: profileSnapshot) {
    this._latestOutcome.next({ outcome: "super", profile: profile });
    this._superProfiles.next(this._superProfiles.getValue().concat(profile));
  }
}
