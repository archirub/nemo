import { Component, OnInit } from "@angular/core";
import { AngularFireFunctions } from "@angular/fire/functions";

import { SwipeStackStoreService } from "@services/stores/swipe-stack-store/swipe-stack-store.service";
import { FakeDataService } from "@services/index";

import { Observable } from "rxjs";

import { profileSnapshot } from "@interfaces/profile";

@Component({
  selector: "app-home",
  templateUrl: "home.page.html",
  styleUrls: ["home.page.scss"],
})
export class HomePage implements OnInit {
  swipeProfiles: Observable<profileSnapshot[]>;

  constructor(
    private fakeData: FakeDataService,
    private swipeStackStore: SwipeStackStoreService,
    private cloudFunctions: AngularFireFunctions
  ) {}

  ngOnInit() {
    this.swipeProfiles = this.swipeStackStore.profiles;
  }
}
