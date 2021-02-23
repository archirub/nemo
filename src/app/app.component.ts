import { Component, OnInit, OnDestroy } from "@angular/core";

import { Platform } from "@ionic/angular";
import { SplashScreen } from "@ionic-native/splash-screen/ngx";
import { StatusBar } from "@ionic-native/status-bar/ngx";

import { ChatStore, CurrentUserStore, SwipeStackStore } from "@stores/index";
import { AuthService } from "@services/index";
import { AngularAuthService } from "@services/login/auth/angular-auth.service";
import { Router } from "@angular/router";
import { Subscription } from "rxjs";

@Component({
  selector: "app-root",
  templateUrl: "app.component.html",
  styleUrls: ["app.component.scss"],
})
export class AppComponent implements OnInit, OnDestroy {
  private authSub: Subscription;

  constructor(
    private platform: Platform,
    private splashScreen: SplashScreen,
    private statusBar: StatusBar,
    private auth: AuthService,
    private chatStore: ChatStore,
    private currentUserStore: CurrentUserStore,
    private swipeStackStore: SwipeStackStore,
    private signUpAuthService: AngularAuthService,
    private router: Router,
  ) {
    this.initializeApp();
  }
  ngOnDestroy(): void {
    if (this.authSub) {
      this.authSub.unsubscribe();
    }
  }

  ngOnInit(): void {
    this.authSub = this.signUpAuthService.userIsAuthenticated.subscribe(isAuth => {
      if (isAuth) { 
        this.signUpAuthService.userType.subscribe(
          user_type => {
            if (user_type == 'BaselineUser' || user_type == 'FullUser') {
              console.log("going home baby"); 
              this.router.navigateByUrl('main'); 
            }
            else if (user_type == 'AuthenticatedUser') {
              console.log("going required"); 
              this.router.navigateByUrl('welcome/signuprequired'); //uncomment to have specialized routing
              // this.router.navigateByUrl('main'); //this is for development
            }
          });}
      // else { console.log("welcomed"); this.router.navigateByUrl('welcome'); }
    });
  }

  logOut(): void {
    this.signUpAuthService.logout()
  }

  initializeApp() {
    this.platform.ready().then(() => {
      this.statusBar.styleDefault();
      this.splashScreen.hide();

      // this.auth
      //   .logIn()
      //   .then((uid) => this.currentUserStore.initializeStore(uid))
      //   .then((uid) => this.swipeStackStore.initializeStore(uid))
      //   .then((uid) => this.chatStore.initializeStore(uid));
    });

  }}
