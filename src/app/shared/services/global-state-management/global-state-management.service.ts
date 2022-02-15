import { Injectable } from "@angular/core";
import { NavigationEnd, Router } from "@angular/router";

import { AngularFirestore } from "@angular/fire/firestore";

import { Storage } from "@capacitor/storage";
import { concat, defer, forkJoin, from, merge, Observable, of, Subject } from "rxjs";
import {
  concatMap,
  distinctUntilChanged,
  filter,
  map,
  mergeMap,
  share,
  switchMap,
  take,
  tap,
} from "rxjs/operators";

import { SignupService } from "@services/signup/signup.service";
import { FirebaseAuthService } from "@services/firebase-auth/firebase-auth.service";
import { routerInitListenerService } from "./initial-url.service";
import { ConnectionService } from "@services/connection/connection.service";
import { StoreResetter } from "./store-resetter.service";

import { FirebaseUser } from "./../../interfaces/firebase.model";
import { GlobalErrorHandler } from "@services/errors/global-error-handler.service";
import { LoadingAndAlertManager } from "@services/loader-and-alert-manager/loader-and-alert-manager.service";
import { App } from "@capacitor/app";
import { StoreStateManager } from "./store-state-manager.service";
import { AngularFireAuth } from "@angular/fire/auth";
import { NavController } from "@ionic/angular";
import { EmailVerificationService } from "src/app/welcome/signupauth/email-verification.service";
import { ManagementPauser } from "./management-pauser.service";

type pageName =
  | "chats"
  | "home"
  | "own-profile"
  | "settings"
  | "messenger"
  | "welcome"
  | "login"
  | "signup"
  | "signup-to-app";

type userState =
  | "unauthenticated"
  | "authenticated"
  | "is-signing-up"
  | "has-no-documents"
  | "full";

// guide map to what each userState means:
// - unauthenticated = not authenticated with Firebase auth
// - authenticated = authenticated with Firebase auth
// - is-signing-up = "authenticated" state + email verified + is on a sign up page (assumed to be signing up)
// - has-no-documents = "authenticated" state + email verified + is not on sign up page + has no documents on database
// - full = "authenticated" state + email verified + has documents on database

@Injectable({
  providedIn: "root",
})
export class GlobalStateManagementService {
  private userState = new Subject<userState>();
  userState$ = this.userState.asObservable().pipe(distinctUntilChanged());

  private alreadyConnectedOnce: boolean = false;

  constructor(
    private router: Router,
    private navCtrl: NavController,

    private firestore: AngularFirestore,
    private afAuth: AngularFireAuth,

    private managementPauser: ManagementPauser,
    private storeStateManager: StoreStateManager,
    private errorHandler: GlobalErrorHandler,
    private loadingAlertManager: LoadingAndAlertManager,
    private signupService: SignupService,
    private firebaseAuthService: FirebaseAuthService,
    private routerInitListener: routerInitListenerService,
    private storeResetter: StoreResetter,
    private connectionService: ConnectionService,

    private emailVerificationService: EmailVerificationService
  ) {}

  public activate$ = this.connectionService.monitor().pipe(
    switchMap((isConnected) => {
      if (isConnected && !this.alreadyConnectedOnce) {
        this.alreadyConnectedOnce = true;
        return this.globalManagement$();
      } else if (isConnected && this.alreadyConnectedOnce) {
        return from(this.connectionService.displayBackOnlineToast()).pipe(
          switchMap(() => this.globalManagement$())
        );
      } else {
        return this.connectionService.displayOfflineToast();
      }
    }),
    share()
  );

  private globalManagement$(): Observable<void> {
    return this.afAuth.user.pipe(
      this.managementPauser.checkForPaused(),
      switchMap((user) => forkJoin([of(user), this.isUserEmailVerified(user)])),
      switchMap(([user, emailIsVerified]) => {
        // to always activate
        this.storeStateManager.activateDefault();

        const observables$: Observable<any>[] = [];

        if (!user) {
          // if user isn't authenticated, do the corresponding routine
          observables$.push(this.nobodyAuthenticatedRoutine());
        } else if (!emailIsVerified) {
          // if user hasn't verified his email yet, go to email verification
          observables$.push(this.requiresEmailVerificationRoutine());
        } else {
          // is user is authenticated and his email is verified, then go on
          observables$.push(this.userIsValidRoutine(user));
        }

        return merge(...observables$);
      })
    );
  }

  /**
   * Procedure followed when there is no one authenticated
   */
  private nobodyAuthenticatedRoutine(): Observable<any> {
    return of(this.router.url).pipe(
      tap(() => this.userState.next("unauthenticated")),
      concatMap((url) => {
        if (["/welcome/login", "/welcome/signupauth", "/welcome"].includes(url))
          return of(""); // do nothing of user is in login, signupauth or welcome page,
        // as no auth is required for these three pages
        return concat(
          this.resetAppState(async () => {}),
          this.navCtrl.navigateForward("/welcome")
        );
      })
    );
  }

  private requiresEmailVerificationRoutine(): Observable<any> {
    return of(this.router.url).pipe(
      tap(() => this.userState.next("authenticated")),
      concatMap((url) => {
        // default for now, easiest thing.
        // logic in there made so that it can be called many times like that without
        // hindering anything
        return defer(() => this.emailVerificationService.goStraightToEmailVerification());
      })
    );
  }

  private userIsValidRoutine(user: FirebaseUser) {
    return this.isUserSigningUp().pipe(
      switchMap((userIsSigningUp) => {
        // if user is signing up, then do nothing
        if (userIsSigningUp) {
          this.userState.next("is-signing-up");
          return this.signupService.checkAndRedirect();
        }

        // otherwise, continue the procedure
        return this.doesProfileDocExist(user.uid).pipe(
          switchMap((profileDocExists) => {
            // "null" implies there has been an error and we couldn't get an answer on whether
            // it exists. Hence take no action
            if (profileDocExists === null) return of("");
            if (profileDocExists === false) {
              this.userState.next("has-no-documents");
              return this.noDocumentsRoutine(user);
            }
            this.userState.next("full");
            return this.hasDocumentsRoutine$();
          })
        );
      })
    );
  }

  /**
   * Procedure followed when there is someone authenticated but no documents associated with
   * that account on the database. We check whether that user has documents on the db by attempting
   * to fetch that person's profile
   */
  private noDocumentsRoutine(user: FirebaseUser): Observable<void> {
    const pauseRequestId = "noDocumentsRoutine";

    const finishProfileProcedure = () => {
      return this.signupService.checkAndRedirect();
    };
    const abortProfileProcedure = async () => {
      try {
        // pausing the management as the Firebase user state is strange here and keeps changing and we don't want ot react to these changes
        await this.managementPauser.requestPause(pauseRequestId);
        await Storage.clear();
        await user.delete();
        await this.navCtrl.navigateForward("/welcome");
      } catch (err) {
        if (err?.code === "auth/requires-recent-login") {
          await this.firebaseAuthService.reAuthenticationProcedure(user);
          await Storage.clear();
          await user.delete();

          await new Promise((resolve) => {
            const interval = setInterval(async () => {
              // purposefully not using the error handling, as we are
              // waiting for it to be null! It being null would be normal
              const u = await this.afAuth.currentUser;

              if (!u) {
                clearInterval(interval);
                resolve({ user: u });
              }
            }, 250);
          })
            .then(() => this.managementPauser.unrequestPause(pauseRequestId))
            .then(() => this.navCtrl.navigateForward("/welcome"));
        }

        return this.managementPauser.unrequestPause(pauseRequestId);
      }

      return this.managementPauser.unrequestPause(pauseRequestId);
    };

    const alertOptions = {
      header: "Incomplete Account",
      message: `
      The account with which you're signed in is incomplete, you can choose to
      finish signing up or abort and be taken back to the welcome page. 
      `,

      buttons: [
        {
          text: "Abort",
          handler: abortProfileProcedure,
        },
        {
          text: "Finish",
          handler: finishProfileProcedure,
        },
      ],
    };

    return from(this.loadingAlertManager.createAlert(alertOptions)).pipe(
      switchMap((alert) => this.loadingAlertManager.presentNew(alert, "replace-erase"))
    );
  }

  private hasDocumentsRoutine$() {
    // case where person is in signupToApp
    if (this.getPageFromUrl(this.router.url) === "signup-to-app") return of("");
    // makes it such that we only navigate to home if the user is not in main
    // such that it doesn't infringe on the user experience
    if (this.pageIsMain(this.getPageFromUrl(this.router.url)))
      return merge(this.storesManagement(), this.activateAppLifecycleHooks());
    return merge(
      this.storesManagement(),
      this.activateAppLifecycleHooks(),
      this.navCtrl.navigateForward("main/tabs/home")
    );
  }

  private activateAppLifecycleHooks() {
    const actions = async () => {
      await App.removeAllListeners();

      await App.addListener("appStateChange", ({ isActive }) => {
        // this ensures the swipe choices are registered when the user leaves the app
        if (!isActive) this.storeStateManager.onInactiveAppState();
      });
    };

    return defer(() => actions());
  }

  public isInMain(): Observable<boolean> {
    return this.listenToRouter().pipe(map((page) => this.pageIsMain(page)));
  }

  private listenToRouter(): Observable<pageName> {
    // serves as notification for when the router has been initialized
    const initialUrl$ = this.routerInitListener.routerHasInit$.pipe(
      map(() => this.router.url)
    );

    return concat(initialUrl$, this.router.events).pipe(
      filter((event) => event instanceof NavigationEnd || typeof event === "string"),
      map((event: NavigationEnd) =>
        this.getPageFromUrl(event instanceof NavigationEnd ? event.url : event)
      )
    );
  }

  private storesManagement(): Observable<void> {
    return this.listenToRouter().pipe(
      mergeMap((page) => this.activateCorrespondingStores(page))
    );
  }

  private activateCorrespondingStores(page: pageName): Observable<any> {
    if (this.pageIsMain(page)) {
      return of(this.storeStateManager.activateUserDependent());
    }
    return of("");

    // let storesToActivate$: Observable<any>[] = [];

    // if (this.pageIsMain(page))
    //   storesToActivate$ = storesToActivate$.concat(
    //     this.userStore.fillStore(),
    //     this.swipeStackStore.activateStore(),
    //     this.searchCriteriaStore.activateStore(),
    //     this.chatboardStore.activateStore(),
    //     this.OwnPicturesStore.activateStore(),
    //     this.chatboardPicturesStore.activateStore(
    //       this.chatboardStore.allChats$,
    //       this.chatboardStore.hasNoChats$
    //     )
    //   );
    // //
    // // if (this.pageIsMain(page)) storesToActivate$.push(this.userStore.fillStore());

    // // if (page === "chats" || page === "messenger") {
    // //   storesToActivate$.push(this.chatboardStore.activateStore());
    // //   storesToActivate$.push(
    // //     this.chatboardPicturesStore.activateStore(
    // //       this.chatboardStore.allChats$,
    // //       this.chatboardStore.hasNoChats$
    // //     )
    // //   );
    // // }

    // // // COMMENTED OUT FOR DEVELOPMENT ONLY -  to not fetch a swipe stack every time
    // // if (page === "home") storesToActivate$.push(this.swipeStackStore.activateStore());

    // // if (page === "own-profile" || page === "settings") {
    // //   storesToActivate$.push(this.OwnPicturesStore.activateStore());
    // // }
    // return storesToActivate$.length > 0 ? combineLatest(storesToActivate$) : of("");
  }

  private getPageFromUrl(url: string): pageName {
    if (url.includes("chats")) return "chats";
    if (url.includes("home")) return "home";
    if (url.includes("own-profile")) return "own-profile";
    if (url.includes("settings")) return "settings";
    if (url.includes("messenger")) return "messenger";
    if (url.includes("login")) return "login";
    if (url.includes("signup")) return "signup";
    if (url.includes("signup-to-app")) return "signup-to-app";
    if (url === "/welcome") return "welcome";
    return null;
  }

  private pageIsMain(page: pageName): boolean {
    const mainPages: pageName[] = [
      "home",
      "own-profile",
      "chats",
      "settings",
      "messenger",
    ];
    if (mainPages.includes(page)) return true;
    return false;
  }

  private pageIsWelcome(page: pageName): boolean {
    const welcomePages: pageName[] = ["welcome", "login", "signup"];
    if (welcomePages.includes(page)) return true;
    return false;
  }

  private isUserEmailVerified(user: FirebaseUser): Observable<boolean> {
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
      switchMap(() =>
        this.firestore
          .collection("profiles")
          .doc(uid)
          .get()
          .pipe(
            this.errorHandler.convertErrors("firestore"),
            this.errorHandler.handleErrors()
          )
      ),
      take(1),
      map((doc) => doc?.exists)
    );
  }

  /**
   * Resets the content of the stores and clears the local storage
   */
  public resetAppState(midResetTask: () => Promise<any>) {
    return forkJoin([of(this.storeResetter.resetStores(midResetTask)), Storage.clear()]);
  }
}
