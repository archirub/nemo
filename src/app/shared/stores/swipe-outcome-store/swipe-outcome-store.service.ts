import { Injectable } from "@angular/core";
import { AngularFireFunctions } from "@angular/fire/functions";

import { BehaviorSubject, Observable } from "rxjs";

import { Profile } from "@classes/index";
import {
  registerSwipeChoicesRequest,
  registerSwipeChoicesResponse,
  uidChoiceMap,
  profileChoiceMap,
  swipeChoice,
} from "@interfaces/index";

@Injectable({
  providedIn: "root",
})
export class SwipeOutcomeStore {
  private _swipeChoices: BehaviorSubject<profileChoiceMap[]>;
  private _swipeAnswers: BehaviorSubject<uidChoiceMap[]>;

  public readonly swipeChoices: Observable<profileChoiceMap[]>;
  public readonly swipeAnswers: Observable<uidChoiceMap[]>;

  constructor(private afFunctions: AngularFireFunctions) {
    this._swipeChoices = new BehaviorSubject<profileChoiceMap[]>([]);
    this._swipeAnswers = new BehaviorSubject<uidChoiceMap[]>([]);
    this.swipeChoices = this._swipeChoices.asObservable();
    this.swipeAnswers = this._swipeAnswers.asObservable();
  }

  public yesSwipe(profile: Profile) {
    if (!profile) return;
    const choice: swipeChoice = "yes";
    const choiceMap: profileChoiceMap = { choice, profile };
    this._swipeChoices.next(this._swipeChoices.getValue().concat(choiceMap));
  }

  public noSwipe(profile: Profile) {
    if (!profile) return;
    const choice: swipeChoice = "no";
    const choiceMap: profileChoiceMap = { choice, profile };
    this._swipeChoices.next(this._swipeChoices.getValue().concat(choiceMap));
  }

  public superSwipe(profile: Profile) {
    if (!profile) return;
    const choice: swipeChoice = "yes";
    const choiceMap: profileChoiceMap = { choice, profile };
    this._swipeChoices.next(this._swipeChoices.getValue().concat(choiceMap));
  }

  public addToSwipeAnswers(answers: uidChoiceMap[]) {
    if (!answers) return;
    this._swipeAnswers.next(this._swipeAnswers.getValue().concat(answers));
    console.log("New answers:", this._swipeAnswers.getValue());
  }

  public removeFromSwipeAnswers(answers: uidChoiceMap[]) {
    if (!answers) return;
    this._swipeAnswers.next(
      this._swipeAnswers
        .getValue()
        .filter((answer) => !answers.map((ans) => ans.uid).includes(answer.uid))
    );
  }

  public getChoiceOf(uid: string): swipeChoice {
    if (!uid) return;
    const answers = this._swipeAnswers.getValue();
    const index: number = answers.findIndex((answer) => answer.uid === uid);
    if (index === -1) {
      console.error("User not in answers observable:", uid);
      return;
    }
    return answers[index].choice;
  }

  public async registerSwipeChoices() {
    const choices: uidChoiceMap[] = this._swipeChoices.getValue().map((choiceMap) => {
      return { uid: choiceMap.profile.uid, choice: choiceMap.choice };
    });
    const requestData: registerSwipeChoicesRequest = { choices };

    try {
      const responseData = (await this.afFunctions
        .httpsCallable("registerSwipeChoices")(requestData)
        .toPromise()) as registerSwipeChoicesResponse;

      this.removeFromSwipeAnswers(choices);

      console.log("Successfully registered swipe choices to database.");
    } catch (e) {
      throw new Error(`An error occured while saving swipe choices to db - ${e}`);
    }
  }
}
