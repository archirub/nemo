import { Injectable } from "@angular/core";
import { AngularFireAuth } from "@angular/fire/auth";

import { concat, forkJoin, from, iif, Observable, of } from "rxjs";

import {
  ChatStore,
  CurrentUserStore,
  SearchCriteriaStore,
  SwipeOutcomeStore,
  OtherProfilesStore,
  SwipeStackStore,
  SettingsStore,
} from "@stores/index";
// import { ChatStore } from "@stores/chat-store/chat-store.service";
// import { CurrentUserStore } from "@stores/current-user-store/current-user-store.service";
// import { SearchCriteriaStore } from "@stores/search-criteria-store/search-criteria-store.service";
// import { OtherProfilesStore } from "@stores/other-profiles-store/other-profiles-store.service";
// import { SwipeOutcomeStore } from "@stores/swipe-outcome-store/swipe-outcome-store.service";
// import { SwipeStackStore } from "@stores/swipe-stack-store/swipe-stack-store.service";
// import { SettingsStore } from "@stores/settings-store/settings-store.service";

import firebase from "firebase";
import { catchError, concatMap, first, map, switchMap, take, tap } from "rxjs/operators";
import { Router } from "@angular/router";
import { Storage } from "@capacitor/core";
import { AlertController } from "@ionic/angular";
import { AngularFirestore } from "@angular/fire/firestore";
import { SignupService } from "@services/signup/signup.service";
// import { SignupService } from "@services/index";

@Injectable({
  providedIn: "root",
})
export class InitService {
  constructor(
    private router: Router,
    private afAuth: AngularFireAuth,
    private firestore: AngularFirestore,
    private alertCtrl: AlertController,
    private signupService: SignupService,

    private userStore: CurrentUserStore,
    private chatStore: ChatStore,
    private searchCriteriaStore: SearchCriteriaStore,
    private otherProfilesStore: OtherProfilesStore,
    private swipeOutcomeStore: SwipeOutcomeStore,
    private swipeStackStore: SwipeStackStore,
    private settingsStore: SettingsStore
  ) {}

  initRoutine() {
    return this.getFirebaseUser().pipe(
      concatMap((user) => {
        if (!user) return this.nobodyAuthenticatedRoutine();
        return this.somebodyAuthenticatedRoutine(user);
      })
    );
  }

  private getFirebaseUser(): Observable<firebase.User | null> {
    return this.afAuth.authState;
  }

  private somebodyAuthenticatedRoutine(user: firebase.User) {
    return this.isUserSigningUp().pipe(
      concatMap((userSigningUp) => {
        if (userSigningUp) return of(); // if user is signing up, then do nothing
        // otherwise, continue the procedure
        return this.doesProfileDocExist(user.uid).pipe(
          take(1),
          concatMap((profileDocExists) => {
            if (!profileDocExists) return this.noDocumentsRoutine(user);
            return this.hasDocumentsRoutine(user);
          })
        );
      })
    );
  }

  /**
   * Procedure followed when there is no one authenticated
   */
  private nobodyAuthenticatedRoutine(): Observable<any> {
    return concat(this.resetAppState(), this.router.navigateByUrl("/welcome"));
  }

  private hasDocumentsRoutine(user: firebase.User): Observable<any> {
    return concat(this.resetAppState(), this.initMainStores(user.uid)).pipe(
      concatMap(() => {
        // makes it such that we only navigate to home if the user is not in main
        // such that it doesn't infringe on the user experience
        const currentPath = this.router.url;
        if (currentPath.startsWith("main") || currentPath.startsWith("/main"))
          return of();
        return this.router.navigateByUrl("main/tabs/home");
      })
    );
  }

  /**
   * Procedure followed when there is someone authenticated but no documents associated with
   * that account on the database. We check whether that user has documents on the db by attempting
   * to fetch that person's profile
   */
  private noDocumentsRoutine(user: firebase.User): Observable<void> {
    const reAuthenticationProcedure = (user: firebase.User) => {
      return from(
        this.alertCtrl.create({
          header: "Reauthenticate to abort",
          message: `
      The account was signed in too long ago. Please provide the password
      to <strong>${user.email}</strong> so that we can complete the abortion procedure.
    `,
          inputs: [{ name: "password", type: "text" }],
          buttons: [
            {
              text: "Cancel",
              role: "cancel",
              handler: async () => {
                await this.afAuth.signOut();
                return this.router.navigateByUrl("/welcome");
              },
            },
            {
              text: "Okay",
              handler: async (data) => {
                const credentials = firebase.auth.EmailAuthProvider.credential(
                  user.email,
                  data.password
                );
                await user.reauthenticateWithCredential(credentials);
                await user.delete();
                return this.router.navigateByUrl("/welcome");
              },
            },
          ],
        })
      ).pipe(concatMap((alert) => alert.present()));
    };

    const finishProfileProcedure = () => {
      this.emptyStores(); // to be safe
      return this.signupService.checkAndRedirect();
    };
    const abortProfileProcedure = async () => {
      this.emptyStores(); // to be safe
      await from(user.delete())
        .pipe(
          catchError((err) => {
            if (err?.code === "auth/requires-recent-login")
              return reAuthenticationProcedure(user);
          })
        )
        .toPromise();
    };

    const alertOptions = {
      header: "We found an incomplete account",
      message: `
      The account with which you're signed in is incomplete, you can choose to
      finish signing up or abort and be taken back to the welcome page. 
      `,

      buttons: [
        {
          text: "Finish profile",
          handler: finishProfileProcedure,
        },
        {
          text: "Abort profile",
          handler: abortProfileProcedure,
        },
      ],
    };

    return from(this.alertCtrl.create(alertOptions)).pipe(
      switchMap((alert) => alert.present())
    );
  }

  /**
   * This is a pretty poor check to see if the user is in the process is signing up, but seems to work
   * okay!
   * The purpose of this function is to be used right after the user completes the "auth"
   * part of the signing up process, where the auth state changes to "user is authenticated"
   * and the user still has no document on the database,
   * but there is no need to show the alert "abort or complete profile" since this is exactly
   * what the user is doing
   */
  private isUserSigningUp(): Observable<boolean> {
    return of(this.router.url).pipe(
      map((url) => {
        if (
          url === "/welcome/signuprequired" ||
          url === "/welcome/signupauth" ||
          url === "/welcome/signupoptional"
        )
          return true;
        return false;
      })
    );
  }

  private doesProfileDocExist(uid: string): Observable<boolean> {
    return this.firestore
      .doc("profiles/" + uid)
      .valueChanges()
      .pipe(
        first(),
        map((doc) => !!doc)
      );
  }

  private initMainStores(uid: string) {
    return concat(this.userStore.fillStore(uid), this.chatStore.initializeStore(uid));
  }

  /**
   * Resets the content of the stores and clears the local storage
   */
  private resetAppState() {
    return forkJoin([of(this.emptyStores()), Storage.clear()]);
  }

  private emptyStores() {
    this.userStore.resetStore();
    this.chatStore.resetStore();
    this.searchCriteriaStore.resetStore();
    this.swipeOutcomeStore.resetStore();
    this.swipeStackStore.resetStore();
    this.otherProfilesStore.resetStore();
    this.settingsStore.resetStore();
    // ANY OTHERS / NEW ONES ? Add them here
  }
}
