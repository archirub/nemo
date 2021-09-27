import { EmptyStoresService } from "./empty-stores.service";
import { Injectable } from "@angular/core";
import { AlertController } from "@ionic/angular";
import { NavigationStart, Router } from "@angular/router";

import { AngularFireAuth } from "@angular/fire/compat/auth";
import { AngularFirestore } from "@angular/fire/compat/firestore";
import { Storage } from "@capacitor/core";

import {
  BehaviorSubject,
  combineLatest,
  concat,
  forkJoin,
  from,
  interval,
  merge,
  Observable,
  of,
  timer,
} from "rxjs";
import {
  concatMap,
  delay,
  filter,
  first,
  map,
  mergeMap,
  retry,
  switchMap,
  tap,
} from "rxjs/operators";

import { OwnPicturesStore } from "@stores/pictures/own-pictures/own-pictures.service";
import { ChatboardStore } from "@stores/chatboard/chatboard-store.service";

import { SearchCriteriaStore } from "@stores/search-criteria/search-criteria-store.service";
import { SwipeStackStore } from "@stores/swipe-stack/swipe-stack-store.service";
import { CurrentUserStore } from "@stores/current-user/current-user-store.service";
import { ChatboardPicturesStore } from "@stores/pictures/chatboard-pictures/chatboard-pictures.service";

import { SignupService } from "@services/signup/signup.service";
import { FirebaseAuthService } from "@services/firebase-auth/firebase-auth.service";
import { routerInitListenerService } from "./initial-url.service";

import { SignupAuthMethodSharer } from "../../../welcome/signupauth/signupauth-method-sharer.service";
import { ConnectionService } from "@services/connection/connection.service";
import { User } from "@angular/fire/auth";
import { UniversitiesStore } from "@stores/universities/universities.service";

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
  auth$ = new BehaviorSubject<User>(null);

  alreadyConnectedOnce: boolean = false;

  constructor(
    private router: Router,
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
    private swipeStackStore: SwipeStackStore,
    private OwnPicturesStore: OwnPicturesStore,
    private universitiesStore: UniversitiesStore,
    private searchCriteriaStore: SearchCriteriaStore
  ) {
    // format allows for this.auth$ to be a BehaviorSubject version of the Firebase.User observable
    this.afAuth.user.subscribe(this.auth$);
  }

  activate(): Observable<any> {
    return this.connectionService.monitor().pipe(
      switchMap((isConnected) => {
        if (isConnected && !this.alreadyConnectedOnce) {
          this.alreadyConnectedOnce = true;
          return this.globalManagement();
        } else if (isConnected && this.alreadyConnectedOnce) {
          return from(this.connectionService.displayBackOnlineToast()).pipe(
            switchMap(() => this.globalManagement())
          );
        } else {
          return this.connectionService.displayOfflineToast();
        }
      })
    );
  }

  public globalManagement(): Observable<void> {
    return this.getFirebaseUser().pipe(
      tap((a) => console.log("start of global management chain", a)),
      switchMap((user) => forkJoin([of(user), this.isUserEmailVerified(user)])),
      switchMap(([user, emailIsVerified]) => {
        const observables$: Observable<any>[] = [];

        // to always activate
        observables$.push(this.activateDefaultStores());

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

  private activateDefaultStores() {
    const storesToActivate$: Observable<any>[] = [];

    storesToActivate$.push(this.universitiesStore.fetchUniversities());

    return merge(...storesToActivate$);
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

  private requiresEmailVerificationRoutine(): Observable<any> {
    return of(this.router.url).pipe(
      concatMap((url) =>
        url !== "/welcome/signupauth"
          ? this.router.navigateByUrl("/welcome/signupauth")
          : of("")
      ),
      concatMap(() =>
        !!this.signupauthMethodSharer.goStraightToEmailVerification
          ? this.signupauthMethodSharer.goStraightToEmailVerification()
          : of("")
      )
    );
  }

  private userIsValidRoutine(user: User) {
    return this.isUserSigningUp().pipe(
      switchMap((userIsSigningUp) => {
        // COMMENTED OUT FOR DEVELOPMENT ONLY

        // if user is signing up, then do nothing
        if (userIsSigningUp) return this.signupService.checkAndRedirect();

        // otherwise, continue the procedure
        return this.doesProfileDocExist(user.uid).pipe(
          switchMap((profileDocExists) => {
            // "null" implies there has been an error and we couldn't get an answer on whether
            // it exists. Hence take no action
            if (profileDocExists === null) return of("");
            if (profileDocExists === false) return this.noDocumentsRoutine(user);
            return this.hasDocumentsRoutine();
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
  private noDocumentsRoutine(user: User): Observable<void> {
    const finishProfileProcedure = () => {
      this.emptyStoresService.emptyStores(); // to be safe
      return this.signupService.checkAndRedirect();
    };
    const abortProfileProcedure = async () => {
      this.emptyStoresService.emptyStores(); // to be safe

      try {
        await Storage.clear();
        await user.delete();
        await this.router.navigateByUrl("/welcome");
      } catch (err) {
        if (err?.code === "auth/requires-recent-login") {
          await this.firebaseAuthService.reAuthenticationProcedure(user);
          await Storage.clear();
          await user.delete();

          await new Promise((resolve) => {
            const interval = setInterval(async () => {
              const u = await this.afAuth.currentUser;
              console.log("this is the current user", u);

              if (!u) {
                clearInterval(interval);
                resolve({ user: u });
              }
            }, 250);
          }).then(() => this.router.navigateByUrl("/welcome"));
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
          text: "Abort",
          handler: abortProfileProcedure,
        },
        {
          text: "Finish",
          handler: finishProfileProcedure,
        },
      ],
    };

    return from(this.alertCtrl.create(alertOptions)).pipe(
      switchMap((alert) => alert.present())
    );
  }

  private hasDocumentsRoutine() {
    // case where person is in signupToApp
    if (this.router.url === "/welcome/signup-to-app") return of("");
    // makes it such that we only navigate to home if the user is not in main
    // such that it doesn't infringe on the user experience
    if (this.pageIsMain(this.getPageFromUrl(this.router.url)))
      return this.storesManagement();
    return merge(this.storesManagement(), this.router.navigateByUrl("main/tabs/home"));
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

  private activateCorrespondingStores(page: pageName): Observable<any> {
    let storesToActivate$: Observable<any>[] = [];

    if (this.pageIsMain(page))
      storesToActivate$ = storesToActivate$.concat(
        this.userStore.fillStore(),
        this.swipeStackStore.activateStore(),
        this.searchCriteriaStore.activateStore(),
        this.chatboardStore.activateStore(),
        this.OwnPicturesStore.activateStore(),
        this.chatboardPicturesStore.activateStore(
          this.chatboardStore.allChats$,
          this.chatboardStore.hasNoChats$
        )
      );
    //
    // if (this.pageIsMain(page)) storesToActivate$.push(this.userStore.fillStore());

    // if (page === "chats" || page === "messenger") {
    //   storesToActivate$.push(this.chatboardStore.activateStore());
    //   storesToActivate$.push(
    //     this.chatboardPicturesStore.activateStore(
    //       this.chatboardStore.allChats$,
    //       this.chatboardStore.hasNoChats$
    //     )
    //   );
    // }

    // // COMMENTED OUT FOR DEVELOPMENT ONLY -  to not fetch a swipe stack every time
    // if (page === "home") storesToActivate$.push(this.swipeStackStore.activateStore());

    // if (page === "own-profile" || page === "settings") {
    //   storesToActivate$.push(this.OwnPicturesStore.activateStore());
    // }
    console.log("stores are", storesToActivate$);
    return storesToActivate$.length > 0 ? combineLatest(storesToActivate$) : of("");
  }

  private getFirebaseUser(): Observable<User | null> {
    return this.afAuth.authState;
  }

  private isUserEmailVerified(user: User): Observable<boolean> {
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

  /**
   * Resets the content of the stores and clears the local storage
   */
  private resetAppState() {
    return forkJoin([of(this.emptyStoresService.emptyStores()), Storage.clear()]);
  }
}
