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
  private swipeChoices: BehaviorSubject<profileChoiceMap[]>;
  private swipeAnswers: BehaviorSubject<uidChoiceMap[]>;

  public readonly swipeChoices$: Observable<profileChoiceMap[]>;
  public readonly swipeAnswers$: Observable<uidChoiceMap[]>;

  constructor(private afFunctions: AngularFireFunctions) {
    this.swipeChoices = new BehaviorSubject<profileChoiceMap[]>([]);
    this.swipeAnswers = new BehaviorSubject<uidChoiceMap[]>([]);
    this.swipeChoices$ = this.swipeChoices.asObservable();
    this.swipeAnswers$ = this.swipeAnswers.asObservable();
  }

  resetStore() {
    this.swipeChoices.next([]);
    this.swipeAnswers.next([]);
  }

  public yesSwipe(profile: Profile) {
    if (!profile) return;
    const choice: swipeChoice = "yes";
    const choiceMap: profileChoiceMap = { choice, profile };
    this.swipeChoices.next(this.swipeChoices.getValue().concat(choiceMap));
  }

  public noSwipe(profile: Profile) {
    if (!profile) return;
    const choice: swipeChoice = "no";
    const choiceMap: profileChoiceMap = { choice, profile };
    this.swipeChoices.next(this.swipeChoices.getValue().concat(choiceMap));
  }

  public superSwipe(profile: Profile) {
    if (!profile) return;
    const choice: swipeChoice = "yes";
    const choiceMap: profileChoiceMap = { choice, profile };
    this.swipeChoices.next(this.swipeChoices.getValue().concat(choiceMap));
  }

  public addToSwipeAnswers(answers: uidChoiceMap[]) {
    if (!answers) return;
    this.swipeAnswers.next(this.swipeAnswers.getValue().concat(answers));
    console.log("New answers:", this.swipeAnswers.getValue());
  }

  public removeFromSwipeAnswers(answers: uidChoiceMap[]) {
    if (!answers) return;
    this.swipeAnswers.next(
      this.swipeAnswers
        .getValue()
        .filter((answer) => !answers.map((ans) => ans.uid).includes(answer.uid))
    );
  }

  public getChoiceOf(uid: string): swipeChoice {
    if (!uid) return;
    const answers = this.swipeAnswers.getValue();
    const index: number = answers.findIndex((answer) => answer.uid === uid);
    if (index === -1) {
      console.error("User not in answers observable:", uid);
      return;
    }
    return answers[index].choice;
  }

  public async registerSwipeChoices() {
    const choices: uidChoiceMap[] = this.swipeChoices.getValue().map((choiceMap) => {
      return { uid: choiceMap.profile.uid, choice: choiceMap.choice };
    });
    const requestData: registerSwipeChoicesRequest = { choices };

    try {
      // const responseData = (await this.afFunctions
      //   .httpsCallable("registerSwipeChoices")(requestData)
      //   .toPromise()) as registerSwipeChoicesResponse;

      this.removeFromSwipeAnswers(choices);

      console.log("Successfully registered swipe choices to database.");
    } catch (e) {
      throw new Error(`An error occured while saving swipe choices to db - ${e}`);
    }
  }
}
