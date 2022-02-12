import { Injectable } from "@angular/core";
import { AngularFireFunctions } from "@angular/fire/functions";

import { BehaviorSubject, merge, Observable, of } from "rxjs";

import { Profile } from "@classes/index";
import {
  uidChoiceMap,
  profileChoiceMap,
  swipeChoice,
  registerSwipeChoicesRequest,
  registerSwipeChoicesResponse,
} from "@interfaces/index";
import {
  concatMapTo,
  exhaustMap,
  filter,
  first,
  map,
  share,
  take,
  tap,
} from "rxjs/operators";
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
      first(),
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

  public registerSwipeChoices$: Observable<void> = this.swipeChoices$.pipe(
    first(),
    filter((c) => c.length > 0),
    exhaustMap((choices) => {
      const uidChoiceMaps: uidChoiceMap[] = choices.map((c) => ({
        uid: c.profile.uid,
        choice: c.choice,
      }));

      const request: registerSwipeChoicesRequest = { choices: uidChoiceMaps };

      return this.afFunctions
        .httpsCallable<registerSwipeChoicesRequest, registerSwipeChoicesResponse>(
          "registerSwipeChoices"
        )(request)
        .pipe(
          tap(() =>
            console.info(`registerSwipeChoices triggered for ${choices.length} choices.`)
          ),
          concatMapTo(
            merge(
              this.removeFromSwipeAnswers(uidChoiceMaps),
              this.removeFromSwipeChoices(choices)
            )
          ),
          this.errorHandler.convertErrors("cloud-functions"),
          this.errorHandler.handleErrors()
        );
    }),
    share()
  );
}
