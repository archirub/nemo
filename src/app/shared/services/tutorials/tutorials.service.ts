import { Injectable } from "@angular/core";
import { AngularFireAuth } from "@angular/fire/auth";
import { AngularFirestore } from "@angular/fire/firestore";

import { cloneDeep } from "lodash";
import {
  BehaviorSubject,
  concat,
  defer,
  distinctUntilChanged,
  filter,
  map,
  Observable,
  pairwise,
  startWith,
  switchMap,
  take,
  tap,
  withLatestFrom,
} from "rxjs";

import { CurrentUserStore } from "@stores/index";

import { GlobalErrorHandler } from "@services/errors/global-error-handler.service";

import { HasSeenTutorial, privateProfileFromDatabase } from "@interfaces/profile.model";
import { CustomError } from "@interfaces/error-handling.model";
@Injectable({
  providedIn: "root",
})
export class TutorialsService {
  private hasSeenTutorial = new BehaviorSubject<HasSeenTutorial>(null);
  hasSeenTutorial$ = this.hasSeenTutorial.asObservable();

  private fillTutorial$ = this.appUser.user$.pipe(
    withLatestFrom(this.hasSeenTutorial$),
    filter(([user, hst]) => !!user && !hst),
    take(1),
    map(([u, _]) => u.hasSeenTutorial),
    map((hst) => this.hasSeenTutorial.next(hst))
  );

  get defaultTutorialState(): HasSeenTutorial {
    return { home: false, ownProfile: false, chatBoard: false };
  }

  constructor(
    private afAuth: AngularFireAuth,
    private fs: AngularFirestore,
    private appUser: CurrentUserStore,
    private errorHandler: GlobalErrorHandler
  ) {}

  activate() {
    return concat(this.fillTutorial$, this.manageStoringOnDatabase());
  }

  displayTutorial(tutorial: keyof HasSeenTutorial): Observable<boolean> {
    return this.hasSeenTutorial$.pipe(
      filter((hst) => !!hst),
      tap(() => console.log("displayTutorial")),
      map((hst) => hst[tutorial]),
      distinctUntilChanged(),
      map((hst) => !hst) // since we want to display the tutorial if the user hasn't seen it
    );
  }

  markAsSeen(tutorial: keyof HasSeenTutorial): Observable<void> {
    return this.hasSeenTutorial$.pipe(
      take(1),
      filter((hst) => !!hst),
      map((hst) => {
        const newHst = cloneDeep(hst);
        newHst[tutorial] = true;
        this.hasSeenTutorial.next(newHst);
      })
    );
  }

  private manageStoringOnDatabase() {
    const authUser$ = this.afAuth.user.pipe(
      tap((u) => {
        if (!u) throw new CustomError("local/check-auth-state", "local");
      })
    );

    const updateOnDatabase$ = (uid: string, hst: HasSeenTutorial) =>
      defer(() =>
        this.fs
          .collection("profiles")
          .doc(uid)
          .collection("private")
          .doc<privateProfileFromDatabase>("private")
          .update({ hasSeenTutorial: hst })
      ).pipe(this.errorHandler.convertErrors("firestore"));

    return this.hasSeenTutorial$.pipe(
      startWith(null),
      pairwise(),
      filter(([prevHst, currHst]) => {
        if (!prevHst || !currHst) return false;

        // should store if any of the keys switched from false to true
        const shouldStore = Object.keys(prevHst).reduce((storeIt, key) => {
          if (prevHst[key] === false && currHst[key] === true) return true;
          return storeIt;
        }, false);

        return shouldStore;
      }),
      withLatestFrom(authUser$),
      switchMap(([[_, currHst], user]) => updateOnDatabase$(user.uid, currHst)),
      this.errorHandler.handleErrors()
    );
  }
}
