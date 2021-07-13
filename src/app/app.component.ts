import { Component, OnInit, OnDestroy } from "@angular/core";

import { Platform } from "@ionic/angular";

import { Plugins, Capacitor } from "@capacitor/core";
import { ChatStore, CurrentUserStore, SwipeStackStore } from "@stores/index";
import { AuthService, InitService } from "@services/index";
import { AngularAuthService } from "@services/login/auth/angular-auth.service";
import { Router } from "@angular/router";
import { from, of, Subscription } from "rxjs";
import { exhaustMap, map, switchMap, take } from "rxjs/operators";
import { SignupService } from "@services/signup/signup.service";
import { AngularFireAuth } from "@angular/fire/auth";

@Component({
  selector: "app-root",
  templateUrl: "app.component.html",
  styleUrls: ["app.component.scss"],
})
export class AppComponent implements OnDestroy, OnInit {
  private appInitSub: Subscription;

  constructor(
    private platform: Platform,
    private chatStore: ChatStore,
    private currentUserStore: CurrentUserStore,
    private swipeStackStore: SwipeStackStore,
    private router: Router,
    private signup: SignupService,
    private afAuth: AngularFireAuth,
    private initService: InitService
  ) {
    this.initializeApp();
  }

  ngOnInit() {
    this.afAuth.authState.subscribe((a) => console.log("change in authstate: ", a));
  }
  ngOnDestroy(): void {
    this.appInitSub?.unsubscribe();
  }

  initializeApp() {
    this.platform.ready().then(() => {
      if (Capacitor.isPluginAvailable("SplashScreen")) {
        Plugins.SplashScreen.hide();
      }

      this.appInitSub = this.initService.initRoutine().subscribe();

      // const storesInit$ = (uid: string) =>
      //   from(this.currentUserStore.initializeStore(uid)).pipe(
      //     exhaustMap((uid) => this.swipeStackStore.initializeStore(uid)),
      //     exhaustMap((uid) => this.chatStore.initializeStore(uid))
      //   );

      // still not perfect, in case where there is both an ongoing signup process and someone is signed in, it doesn't
      // take care of that conflict. It will end up initialising the stores while keeping the person at the signup process so not good

      // make it such that, if a user is authenticated, then try to fetch their documents, and if their are no documents
      // then assume that that person hasn't created an account yet, so redirect to signuprequired and initiate an account creation
      // procedure. If the user has documents, then fetch them, init everything and redirect to main. Make that the main logic
      // to decide what to do. In the case where the user is logged in but without documents, then make a pop up that
      // ask the user whether they want to continue a signup process of xxx email adress, if yes then redirect to signuprequired,
      // otherwise, delete the account and go to welcome.
      // this.appInitSub = from(this.signup.checkAndRedirect())
      //   .pipe(
      //     take(1),
      //     exhaustMap(() => this.afAuth.user),
      //     exhaustMap((user) => {
      //       if (user) {
      //         this.router.navigateByUrl("main/tabs/home");
      //         return storesInit$(user.uid);
      //       }
      //       return of(null);
      //     })
      //   )
      //   .subscribe();
    });
  }
}
