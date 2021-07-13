import { Platform } from "@ionic/angular";
import { Component, OnInit, OnDestroy } from "@angular/core";
import { Router } from "@angular/router";

import { AngularFireAuth } from "@angular/fire/auth";
import { Plugins, Capacitor } from "@capacitor/core";
import { Subscription } from "rxjs";

import { ChatStore, CurrentUserStore, SwipeStackStore } from "@stores/index";
import { InitService } from "@services/init/init.service";
import { SignupService } from "@services/signup/signup.service";

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
    });
  }
}
