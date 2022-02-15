import { Logger } from "./../../functions/custom-rxjs";
import { Injectable } from "@angular/core";
import { AngularFireFunctions } from "@angular/fire/functions";

import { BehaviorSubject, firstValueFrom, Observable, of } from "rxjs";

import { Profile } from "@classes/index";
import {
  uidChoiceMap,
  profileChoiceMap,
  swipeChoice,
  registerSwipeChoicesRequest,
  registerSwipeChoicesResponse,
} from "@interfaces/index";
import { map, take, tap } from "rxjs/operators";
import { GlobalErrorHandler } from "@services/errors/global-error-handler.service";
import { AbstractStoreService } from "@interfaces/stores.model";
import { StoreResetter } from "@services/global-state-management/store-resetter.service";

@Injectable({
  providedIn: "root",
})
export class SwipeOutcomeStore extends AbstractStoreService {
  public isReady$: Observable<boolean> = null;
  private swipeChoices = new BehaviorSubject<profileChoiceMap[]>([]);
  private swipeAnswers = new BehaviorSubject<uidChoiceMap[]>([]);
  private registeringChoices = false;

  swipeChoices$ = this.swipeChoices.asObservable();
  swipeAnswers$ = this.swipeAnswers.asObservable();

  constructor(
    private afFunctions: AngularFireFunctions,
    private errorHandler: GlobalErrorHandler,
    protected resetter: StoreResetter
  ) {
    super(resetter);
  }

  protected systemsToActivate(): Observable<any> {
    return of("");
  }

  protected async resetStore() {
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

  public removeFromSwipeAnswers(answersToRemove: uidChoiceMap[]): Observable<void> {
    return this.swipeAnswers$.pipe(
      take(1),
      map((currentAnswers) => {
        const uidsToRemove = answersToRemove.map((ans) => ans.uid);
        this.swipeAnswers.next(
          currentAnswers.filter((answer) => !uidsToRemove.includes(answer.uid))
        );
      })
    );
  }

  public removeFromSwipeChoices(choicesToRemove: profileChoiceMap[]): Observable<void> {
    return this.swipeChoices$.pipe(
      take(1),
      map((currChoices) => {
        const uidsToRemove = choicesToRemove.map((c) => c.profile.uid);
        this.swipeChoices.next(
          currChoices.filter((choice) => !uidsToRemove.includes(choice.profile.uid))
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

  public async registerSwipeChoices(): Promise<any> {
    if (this.registeringChoices) return;
    this.registeringChoices = true;
    const swipeChoices = await firstValueFrom(this.swipeChoices$);
    if (swipeChoices.length <= 0) return;

    const uidChoiceMaps: uidChoiceMap[] = swipeChoices.map((c) => ({
      uid: c.profile.uid,
      choice: c.choice,
    }));
    const request: registerSwipeChoicesRequest = { choices: uidChoiceMaps };

    try {
      await firstValueFrom(
        this.afFunctions
          .httpsCallable<registerSwipeChoicesRequest, registerSwipeChoicesResponse>(
            "registerSwipeChoices"
          )(request)
          .pipe(
            tap(() =>
              console.info(
                `registerSwipeChoices triggered for ${swipeChoices.length} choices.`
              )
            ),
            this.errorHandler.convertErrors("cloud-functions"),
            this.errorHandler.handleErrors({ strategy: "propagateError" })
          )
      );
    } catch (e) {
      this.registeringChoices = false;
      return;
    }

    await Promise.all([
      firstValueFrom(this.removeFromSwipeAnswers(uidChoiceMaps)),
      firstValueFrom(this.removeFromSwipeChoices(swipeChoices)),
    ]);

    this.registeringChoices = false;
  }
}
