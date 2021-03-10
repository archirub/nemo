import { Component, OnInit, OnDestroy } from "@angular/core";

import { Platform } from "@ionic/angular";

import { Plugins } from "@capacitor/core"
import { ChatStore, CurrentUserStore, SwipeStackStore } from "@stores/index";
import { AuthService } from "@services/index";
import { AngularAuthService } from "@services/login/auth/angular-auth.service";
import { Router } from "@angular/router";
import { Subscription } from "rxjs";
import { take } from "rxjs/operators";
import { Capacitor } from "@capacitor/core";

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
  ) {
    this.initializeApp();
  }
  ngOnDestroy(): void {
    if (this.authSub) {
      this.authSub.unsubscribe();
    }
  }

  ngOnInit(): void {
    this.signUpAuthService.autologin().subscribe(()=> {
      this.authSub = this.signUpAuthService.userIsAuthenticated.subscribe(isAuth => {
        if (isAuth) { 
          console.log("User has been authenticated")
          this.signUpAuthService.userType.subscribe(
            user_type => {
              if (user_type == 'BaselineUser' || user_type == 'FullUser') {
                console.log("ROUTER: HOME"); 
                this.router.navigateByUrl('main/tabs/home'); 
              }
              else if (user_type == 'AuthenticatedUser') {
                console.log("ROUTER: REQUIRED"); 
                this.router.navigateByUrl('welcome/signuprequired'); //uncomment to have specialized routing
                // this.router.navigateByUrl('main'); //this is for development
              }
            });
          }
        else { console.log("ROUTER: WELCOME"); this.router.navigateByUrl('welcome'); }
      });
    })
  }

  logOut(): void {
    this.signUpAuthService.logout()
  }

  initializeApp() {
    this.platform.ready().then(() => {
      if (Capacitor.isPluginAvailable('SplashScreen')) {
        Plugins.SplashScreen.hide()
      }


      this.signUpAuthService.userId.subscribe(async uid => {
        if (uid) {
          console.log("Recieved uid: ", uid);
          this.currentUserStore.initializeStore(uid) ;
            
          this.swipeStackStore.initializeStore(uid);
  
          this.chatStore.initializeStore(uid);
            
        }
        else {
          console.log("Waiting for uid")
        }

      })
      // this.auth
      //   .logIn()
      //   .then((uid) => this.currentUserStore.initializeStore(uid))
      //   .then((uid) => this.swipeStackStore.initializeStore(uid))
      //   .then((uid) => this.chatStore.initializeStore(uid));
    });

  }}
