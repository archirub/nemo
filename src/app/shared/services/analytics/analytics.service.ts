import { Injectable } from "@angular/core";
import { FirebaseAnalytics } from "@capacitor-community/firebase-analytics";
import { environment } from "src/environments/environment.prod";

@Injectable({
  providedIn: "root",
})
export class AnalyticsService {
  constructor() {
    FirebaseAnalytics.initializeFirebase(environment.firebase);
    // FirebaseAnalytics.setCollectionEnabled({
    //   enabled: true
    // });
  }

  // firebaseInit() {
  //   FirebaseAnalytics.initializeFirebase(environment.firebase);
  //   FirebaseAnalytics.setCollectionEnabled({
  //     enabled: true
  //   });
  // }

  async logEvent(type: string, params: object): Promise<void> {
    return FirebaseAnalytics.logEvent({
      name: type,
      params: params,
    });
  }
}
