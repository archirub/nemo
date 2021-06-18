import { Component, OnInit, OnDestroy } from "@angular/core";

import { Platform } from "@ionic/angular";

import { Plugins, Capacitor } from "@capacitor/core";
import { ChatStore, CurrentUserStore, SwipeStackStore } from "@stores/index";
import { AuthService } from "@services/index";
import { AngularAuthService } from "@services/login/auth/angular-auth.service";
import { Router } from "@angular/router";
import { Subscription } from "rxjs";
import { take } from "rxjs/operators";
import { SignupService } from "@services/signup/signup.service";
import { AngularFireAuth } from "@angular/fire/auth";

@Component({
  selector: "app-root",
  templateUrl: "app.component.html",
  styleUrls: ["app.component.scss"],
})
export class AppComponent implements OnInit, OnDestroy {
  private authSub: Subscription;

  constructor(
    private platform: Platform,
    private auth: AuthService,
    private chatStore: ChatStore,
    private currentUserStore: CurrentUserStore,
    private swipeStackStore: SwipeStackStore,
    private signUpAuthService: AngularAuthService,
    private router: Router,
    private signup: SignupService,
    private afAuth: AngularFireAuth
  ) {
    this.initializeApp();
  }
  ngOnDestroy(): void {
    if (this.authSub) {
      this.authSub.unsubscribe();
    }
  }

  ngOnInit(): void {
    // this.signUpAuthService.autologin().subscribe(() => {
    //   this.authSub = this.signUpAuthService.userIsAuthenticated.subscribe((isAuth) => {
    //     if (isAuth) {
    //       console.log("User has been authenticated");
    //       this.signUpAuthService.userType.subscribe((user_type) => {
    //         if (user_type == "BaselineUser" || user_type == "FullUser") {
    //           console.log("ROUTER: HOME");
    //           this.router.navigateByUrl("main/tabs/home");
    //         } else if (user_type == "AuthenticatedUser") {
    //           console.log("ROUTER: REQUIRED");
    //           // DEVELOPMENT
    //           // this.router.navigateByUrl("main/tabs/home");
    //           // PRODUCTION
    //           this.router.navigateByUrl("welcome/signuprequired"); //uncomment to have specialized routing
    //         }
    //       });
    //     } else {
    //       // console.log("ROUTER: WELCOME");
    //       this.router.navigateByUrl("welcome");
    //     }
    //   });
    // });
  }

  logOut(): void {
    this.signUpAuthService.logout();
  }

  initializeApp() {
    this.platform.ready().then(() => {
      if (Capacitor.isPluginAvailable("SplashScreen")) {
        Plugins.SplashScreen.hide();
      }
      console.log("yayayaya");
      this.signup.checkAndRedirect();

      // TEMPORARY (though works fine), not thought through
      this.afAuth.user.subscribe((user) => {
        console.log("current user logged in,", user?.uid);
        if (user) {
          this.router.navigateByUrl("main/tabs/home");
        }
      });

      // HERE UID SHOULD COME FROM FIREBASE AUTH, NOT TOKEN
      //   this.signUpAuthService.userId.subscribe(async (uid) => {
      //     console.log("HAHA", uid);
      //     if (uid) {
      //       this.currentUserStore.initializeStore(uid);

      //       this.swipeStackStore.initializeStore(uid);

      //       this.chatStore.initializeStore(uid);
      //     } else {
      //       // console.log("Waiting for uid")
      //     }
      //   });
    });
  }
}
