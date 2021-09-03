import { EmptyStoresService } from "./empty-stores.service";
import { Injectable } from "@angular/core";
import { AlertController } from "@ionic/angular";
import { ActivatedRoute, NavigationStart, ParamMap, Router } from "@angular/router";

import { AngularFireAuth } from "@angular/fire/auth";
import { AngularFirestore } from "@angular/fire/firestore";
import { Storage } from "@capacitor/core";

import {
  BehaviorSubject,
  combineLatest,
  concat,
  forkJoin,
  from,
  merge,
  Observable,
  of,
  timer,
} from "rxjs";
import {
  catchError,
  concatMap,
  delayWhen,
  filter,
  first,
  last,
  map,
  delay,
  mergeMap,
  retry,
  retryWhen,
  startWith,
  switchMap,
  take,
  tap,
} from "rxjs/operators";

import { OwnPicturesStore } from "@stores/pictures-stores/own-pictures-store/own-pictures.service";
import { ChatboardStore } from "@stores/chatboard-store/chatboard-store.service";
import { SearchCriteriaStore } from "@stores/search-criteria-store/search-criteria-store.service";
import { OtherProfilesStore } from "@stores/other-profiles-store/other-profiles-store.service";
import { SwipeOutcomeStore } from "@stores/swipe-outcome-store/swipe-outcome-store.service";
import { SwipeStackStore } from "@stores/swipe-stack-store/swipe-stack-store.service";
import { SettingsStore } from "@stores/settings-store/settings-store.service";
import { CurrentUserStore } from "@stores/current-user-store/current-user-store.service";
import { ChatboardPicturesStore } from "@stores/pictures-stores/chatboard-pictures-store/chatboard-pictures.service";

import { SignupService } from "@services/signup/signup.service";
import { FirebaseAuthService } from "@services/firebase-auth/firebase-auth.service";
import { routerInitListenerService } from "./initial-url.service";

import firebase from "firebase";
import { SignupAuthMethodSharer } from "../../../welcome/signupauth/signupauth-method-sharer.service";
import { ConnectionService } from "@services/connection/connection.service";

type pageName =
  | "chats"
  | "home"
  | "own-profile"
  | "settings"
  | "messenger"
  | "welcome"
  | "login"
  | "signup";

@Injectable({
  providedIn: "root",
})
export class GlobalStateManagementService {
  auth$ = new BehaviorSubject<firebase.User>(null);

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private alertCtrl: AlertController,

    private afAuth: AngularFireAuth,
    private firestore: AngularFirestore,

    private signupService: SignupService,
    private firebaseAuthService: FirebaseAuthService,
    private routerInitListener: routerInitListenerService,
    private emptyStoresService: EmptyStoresService,
    private connectionService: ConnectionService,

    private signupauthMethodSharer: SignupAuthMethodSharer,

    private userStore: CurrentUserStore,
    private chatboardStore: ChatboardStore,
    private chatboardPicturesStore: ChatboardPicturesStore,
    // private searchCriteriaStore: SearchCriteriaStore,
    // private otherProfilesStore: OtherProfilesStore,
    // private swipeOutcomeStore: SwipeOutcomeStore,
    private swipeStackStore: SwipeStackStore,
    // private settingsStore: SettingsStore,
    private OwnPicturesStore: OwnPicturesStore
  ) {
    // format allows for this.auth$ to be a BehaviorSubject version of the Firebase.User observable
    this.afAuth.user.subscribe(this.auth$);
  }

  activate(): Observable<any> {
    return this.connectionService
      .emitWhenConnected()
      .pipe(switchMap(() => merge(this.authStateManagement(), this.storesManagement())));
  }

  private authStateManagement() {
    return this.getFirebaseUser().pipe(
      concatMap((user) => {
        if (!user) return this.nobodyAuthenticatedRoutine();
        return this.somebodyAuthenticatedRoutine(user);
      })
    );
  }

  private storesManagement(): Observable<void> {
    // serves as notification for when the router has been initialised
    const initialUrl$ = this.routerInitListener.routerHasInit$.pipe(
      map(() => this.router.url)
    );

    return concat(initialUrl$, this.router.events).pipe(
      filter((event) => event instanceof NavigationStart || typeof event === "string"),
      map((event: NavigationStart) =>
        this.getPageFromUrl(event instanceof NavigationStart ? event.url : event)
      ),
      mergeMap((page) => this.activateCorrespondingStores(page))
    );
  }

  private getPageFromUrl(url: string): pageName {
    if (url.includes("chats")) return "chats";
    if (url.includes("home")) return "home";
    if (url.includes("own-profile")) return "own-profile";
    if (url.includes("settings")) return "settings";
    if (url.includes("messenger")) return "messenger";
    if (url.includes("login")) return "login";
    if (url.includes("signup")) return "signup";
    if (url === "/welcome") return "welcome";
    return null;
  }

  private activateCorrespondingStores(page: pageName): Observable<any> {
    if (page === "chats" || page === "messenger")
      return forkJoin([
        this.chatboardStore.activateStore(),
        this.chatboardPicturesStore.activateStore(
          this.chatboardStore.allChats$,
          this.chatboardStore.hasNoChats$
        ),
      ]);

    // COMMENTED OUT FOR DEVELOPMENT ONLY -  to not fetch a swipe stack every time
    // if (page === "home") return this.swipeStackStore.activateStore();

    if (page === "own-profile" || page === "settings")
      return forkJoin([
        this.OwnPicturesStore.activateStore(),
        this.userStore.fillStore(),
      ]);

    return of();
  }

  private getFirebaseUser(): Observable<firebase.User | null> {
    return this.afAuth.authState;
  }

  private somebodyAuthenticatedRoutine(user: firebase.User) {
    return forkJoin([this.isUserEmailVerified(user), this.isUserSigningUp()]).pipe(
      concatMap(([emailIsVerified, userIsSigningUp]) => {
        // COMMENTED OUT FOR DEVELOPMENT ONLY
        // if user hasn't verified his email yet, go to email verification
        // if (!emailIsVerified) return this.requiresEmailVerificationRoutine();

        // if user is signing up, then do nothing
        if (userIsSigningUp) return of();

        // otherwise, continue the procedure
        return this.doesProfileDocExist(user.uid).pipe(
          concatMap((profileDocExists) => {
            // "null" implies there has been an error and we couldn't get an answer on whether
            // it exists. Hence take no action
            if (profileDocExists === null) return of();
            if (profileDocExists === false) return this.noDocumentsRoutine(user);
            return this.hasDocumentsRoutine();
          })
        );
      })
    );
  }

  private requiresEmailVerificationRoutine(): Observable<any> {
    return of(this.router.url).pipe(
      concatMap((url) =>
        url !== "/welcome/signupauth"
          ? this.router.navigateByUrl("/welcome/signupauth")
          : of()
      ),
      concatMap(() =>
        !!this.signupauthMethodSharer.goStraightToEmailVerification
          ? this.signupauthMethodSharer.goStraightToEmailVerification()
          : of()
      )
    );
  }

  /**
   * Procedure followed when there is no one authenticated
   */
  private nobodyAuthenticatedRoutine(): Observable<any> {
    return of(this.router.url).pipe(
      concatMap((url) => {
        if (["/welcome/login", "/welcome/signupauth", "/welcome"].includes(url))
          return of(); // do nothing of user is in login, signupauth or welcome page,
        // as no auth is required for these three pages
        return concat(this.resetAppState(), this.router.navigateByUrl("/welcome"));
      })
    );
  }

  private hasDocumentsRoutine(): Observable<any> {
    return this.initMainStores().pipe(
      // return concat(this.resetAppState(), this.initMainStores()).pipe(
      concatMap(() => {
        // makes it such that we only navigate to home if the user is not in main
        // such that it doesn't infringe on the user experience
        const currentPath = this.router.url;
        if (currentPath.startsWith("/main")) return of();
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
    const finishProfileProcedure = () => {
      this.emptyStoresService.emptyStores(); // to be safe
      return this.signupService.checkAndRedirect();
    };
    const abortProfileProcedure = async () => {
      this.emptyStoresService.emptyStores(); // to be safe

      try {
        await user.delete();
        await this.router.navigateByUrl("/welcome");
      } catch (err) {
        if (err?.code === "auth/requires-recent-login") {
          await this.firebaseAuthService.reAuthenticationProcedure(user);
          await user.delete();
          await this.router.navigateByUrl("/welcome");
        }
      }
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

  private isUserEmailVerified(user: firebase.User): Observable<boolean> {
    return of(user).pipe(map((user) => !!user?.emailVerified));
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
          [
            "/welcome/signuprequired",
            "/welcome/signupauth",
            "/welcome/signupoptional",
          ].includes(url)
        )
          return true;
        return false;
      })
    );
  }

  /**
   * If it returns null, then this means we couldn't get an answer on
   * whether the profile doc exists due to an error, most likely a connectivity error.
   * Hence that must be handled properly where this is used (instead of counting it as false)
   */
  private doesProfileDocExist(uid: string): Observable<boolean | null> {
    return this.connectionService.emitWhenConnected().pipe(
      switchMap(() => this.firestore.collection("profiles").doc(uid).get()),
      first(),
      map((doc) => doc.exists),
      // arbitrary, just so that I don't put infinity, but theoretically it shouldn't
      // require any limit nor any retry at all in the first place.
      // It is just in case you lose connectivity exactly after having regained it
      retry(3)
    );
  }

  private initMainStores() {
    console.log("initinit");
    return concat(
      this.userStore.fillStore()
      // this.chatStore.activateStore()
    );
  }

  /**
   * Resets the content of the stores and clears the local storage
   */
  private resetAppState() {
    return forkJoin([of(this.emptyStoresService.emptyStores()), Storage.clear()]);
  }
}
