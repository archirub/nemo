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

  /* Nemo toggle selection function */
  toggleChange(option) {
    var editor = document.getElementById("editing");
    if (option == "edit") {
      editor.style.display = "flex";
    } else if (option == "view") {
      editor.style.display = "none";
    };
  }
  
  ngOnDestroy() {
    this.currentUser$.unsubscribe();
  }
}
