import { Platform } from "@ionic/angular";
import { Component, OnInit, OnDestroy } from "@angular/core";

import { AngularFireAuth } from "@angular/fire/auth";
import { Plugins, Capacitor } from "@capacitor/core";
import { Subscription } from "rxjs";

import { InitService } from "@services/init/init.service";

@Component({
  selector: "app-root",
  templateUrl: "app.component.html",
  styleUrls: ["app.component.scss"],
})
export class AppComponent implements OnDestroy, OnInit {
  private appInitSub: Subscription;

  constructor(
    private platform: Platform,
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

  async initializeApp() {
    await this.platform.ready();

    if (Capacitor.isPluginAvailable("SplashScreen")) {
      await Plugins.SplashScreen.hide();
    }

    this.appInitSub = this.initService.initRoutine().subscribe();
  }
}
