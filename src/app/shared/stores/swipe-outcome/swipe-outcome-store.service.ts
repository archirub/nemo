import { Injectable } from "@angular/core";
import { AngularFireFunctions } from "@angular/fire/compat/functions";

import { BehaviorSubject, concat, Observable } from "rxjs";

import { Profile } from "@classes/index";
import { uidChoiceMap, profileChoiceMap, swipeChoice } from "@interfaces/index";
import { exhaustMap, map, retry, take } from "rxjs/operators";

@Injectable({
  providedIn: "root",
})
export class SwipeOutcomeStore {
  private swipeChoices = new BehaviorSubject<profileChoiceMap[]>([]);
  public readonly swipeChoices$ = this.swipeChoices.asObservable();

  private swipeAnswers = new BehaviorSubject<uidChoiceMap[]>([]);
  public readonly swipeAnswers$ = this.swipeAnswers.asObservable();

  constructor(private afFunctions: AngularFireFunctions) {}

  resetStore() {
    this.swipeChoices.next([]);
    this.swipeAnswers.next([]);
  }

  public yesSwipe(profile: Profile): Observable<void> {
    return this.swipeChoices$.pipe(
      take(1),
      map((choices) => {
        const newChoice: profileChoiceMap = { choice: "yes", profile };
        this.swipeChoices.next(choices.concat(newChoice));
      })
    );
  }

  public noSwipe(profile: Profile): Observable<void> {
    return this.swipeChoices$.pipe(
      take(1),
      map((choices) => {
        const newChoice: profileChoiceMap = { choice: "no", profile };
        this.swipeChoices.next(choices.concat(newChoice));
      })
    );
  }

  public superSwipe(profile: Profile): Observable<void> {
    return this.swipeChoices$.pipe(
      take(1),
      map((choices) => {
        const newChoice: profileChoiceMap = { choice: "super", profile };
        this.swipeChoices.next(choices.concat(newChoice));
      })
    );
  }

  public addToSwipeAnswers(newAnswers: uidChoiceMap[]): Observable<void> {
    return this.swipeAnswers$.pipe(
      take(1),
      map((answers) => {
        this.swipeAnswers.next(answers.concat(newAnswers));
      })
    );
  }

  public removeFromSwipeAnswers(newAnswers: uidChoiceMap[]): Observable<void> {
    return this.swipeAnswers$.pipe(
      take(1),
      map((currentAnswers) => {
        this.swipeAnswers.next(
          currentAnswers.filter(
            (answer) => !newAnswers.map((ans) => ans.uid).includes(answer.uid)
          )
        );
      })
    );
  }

  public getChoiceOf(uid: string): Observable<swipeChoice | null> {
    return this.swipeAnswers.pipe(
      take(1),
      map((answers) => {
        const index = answers.findIndex((a) => a.uid === uid);
        if (index === -1) return;
        return answers[index].choice;
      })
    );
  }

  public registerSwipeChoices(): Observable<void> {
    return this.swipeChoices$.pipe(
      take(1),
      map((choices): uidChoiceMap[] =>
        choices.map((c) => {
          return { uid: c.profile.uid, choice: c.choice };
        })
      ),
      exhaustMap((choices) =>
        concat(
          this.afFunctions.httpsCallable("registerSwipeChoices")({ choices }),
          this.removeFromSwipeAnswers(choices)
        )
      ),
      retry(3)
    );
  }
}
