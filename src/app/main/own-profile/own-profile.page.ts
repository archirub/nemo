import { Component, OnInit, ViewChild } from "@angular/core";

import { Observable, Subscription } from "rxjs";
import { User, Profile } from "@classes/index";
import { SwipeStackStore, CurrentUserStore } from "@stores/index";
import { AddPhotoComponent } from "@components/index";

@Component({
  selector: "app-own-profile",
  templateUrl: "./own-profile.page.html",
  styleUrls: ["./own-profile.page.scss"],
})
export class OwnProfilePage implements OnInit {
  @ViewChild(AddPhotoComponent) photo: AddPhotoComponent;
  
  currentUser$: Subscription;
  currentUser: User;

  profile: Observable<Profile[]>;

  constructor(
    private swipeStackStore: SwipeStackStore,
    private currentUserStore: CurrentUserStore
    ) {}

  ngOnInit() {
    this.currentUser$ = this.currentUserStore.user.subscribe(
      (profile) => (this.currentUser = profile)
    );

    this.profile = this.swipeStackStore.profiles;
  }

  /* Toggle button changes */
  editSwitch() {

    // Change colors of view/edit labels
    var labels:any = document.getElementsByClassName("view-edit")
    for (let i = 0; i < labels.length; i++) {
      let toggle = labels[i];
      if (toggle.style.color == "var(--ion-color-primary)") {
        toggle.style.color = "var(--ion-color-light-contrast)";
      } else {
        toggle.style.color = "var(--ion-color-primary)";
      };
    }

    // Display/hide the editing window
    var editor = document.getElementById("editing")
    if (editor.style.display == "none") {
      editor.style.display = "flex";
    } else {
      editor.style.display = "none";
    };
  }
  
  ngOnDestroy() {
    this.currentUser$.unsubscribe();
  }
}
