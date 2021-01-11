import { Component } from "@angular/core";

import { Platform } from "@ionic/angular";
import { SplashScreen } from "@ionic-native/splash-screen/ngx";
import { StatusBar } from "@ionic-native/status-bar/ngx";
import { ChatStore } from "@stores/index";
import { AngularFireFunctions } from "@angular/fire/functions";
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
    private chatStore: ChatStore,
    private afFunctions: AngularFireFunctions,
    private auth: AuthService
  ) {
    this.initializeApp();
  }

  initializeApp() {
    this.platform.ready().then(() => {
      this.statusBar.styleDefault();
      this.splashScreen.hide();

      this.auth.logIn().then((uid) => this.chatStore.initializeStore(uid));

      //                      CLOUD FUNCTION CALL "INTERNAL ERROR" PROBLEM.
      // WHEN EXACTLY THE BELOW IS CALLED IN MOCK-DATA-MANAGEMENT (so just another angular app
      // with same version of AngularFire, same location (app.component.ts), presumably same
      // database credentials) IT WORKS. WHY????????????? EVerything that could be related looks absolutely
      // the same, what else is invoked when you call a cloud function like that? Because that means its not a problem
      // with my set up nor the server, its some other shit IN-APP fucking with cloud function calls.
      // TRied replacing all the modules in common with mock-data-management and then running npm install
      // but the same issue shows up, so it doesn't have to do with the difference in version in firebase etc.
      this.afFunctions
        .httpsCallable("helloWorld")({})
        .toPromise()
        .then((r) => console.log(r))
        .catch((e) => console.error("The error is:", e));
    });
  }}
