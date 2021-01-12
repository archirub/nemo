import { Component } from "@angular/core";

import { Platform } from "@ionic/angular";
import { SplashScreen } from "@ionic-native/splash-screen/ngx";
import { StatusBar } from "@ionic-native/status-bar/ngx";

import { ChatStore, CurrentUserStore, SwipeStackStore } from "@stores/index";
import { AuthService } from "@services/index";

@Component({
  selector: "app-root",
  templateUrl: "app.component.html",
  styleUrls: ["app.component.scss"],
})
export class AppComponent {
  constructor(
    private platform: Platform,
    private splashScreen: SplashScreen,
    private statusBar: StatusBar,
    private auth: AuthService,
    private chatStore: ChatStore,
    private currenUserStore: CurrentUserStore,
    private swipeStackStore: SwipeStackStore
  ) {
    this.initializeApp();
  }

  initializeApp() {
    this.platform.ready().then(() => {
      this.statusBar.styleDefault();
      this.splashScreen.hide();

      this.auth
        .logIn()
        .then((uid) => this.currenUserStore.initializeStore(uid))
        .then((uid) => this.swipeStackStore.initializeStore(uid))
        .then((uid) => this.chatStore.initializeStore(uid));
    });
  }
}
