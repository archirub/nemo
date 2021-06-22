import { Component, ElementRef, OnInit, ViewChild } from "@angular/core";

import { Subscription } from "rxjs";
import { User } from "@classes/index";
import { CurrentUserStore } from "@stores/index";
import { AddPhotoComponent } from "@components/index";
import { ProfileCourseComponent } from "./profile-course/profile-course.component";
import { IonTextarea } from "@ionic/angular";
import { Router } from "@angular/router";
import { OwnPicturesService } from "@services/pictures/own-pictures/own-pictures.service";

@Component({
  selector: "app-own-profile",
  templateUrl: "./own-profile.page.html",
  styleUrls: ["./own-profile.page.scss"],
})
export class OwnProfilePage implements OnInit {
  @ViewChild(AddPhotoComponent) photo: AddPhotoComponent;
  @ViewChild("bioInput") bio: IonTextarea;
  @ViewChild("bioClose", { read: ElementRef }) bioClose: ElementRef;
  @ViewChild("depts") depts: ProfileCourseComponent;
  @ViewChild("socs") socs: ProfileCourseComponent;

  profileSub: Subscription;
  profile: User;

  ownPicturesSub: Subscription;

  constructor(
    private currentUserStore: CurrentUserStore,
    private router: Router,
    private ownPicturesService: OwnPicturesService
  ) {}

  ngOnInit() {
    this.ownPicturesSub = this.ownPicturesService.emptinessObserver$.subscribe();
    this.profileSub = this.currentUserStore.user$.subscribe(
      (profile) => (this.profile = profile)
    );
  }

  ngAfterViewInit() {
    this.depts.type = "courses";
    this.socs.type = "societies";
  }

  goToSettings() {
    this.router.navigateByUrl("/main/settings");
  }

  displayExit(section) {
    if (section === "bio" && this.bio.value != "") {
      this.bioClose.nativeElement.style.display = "block";
    } else if (this.bio.value === "") {
      this.bioClose.nativeElement.style.display = "none";
    }
    this.profile.biography = this.bio.value;
  }

  clearInput(section) {
    if (section === "bio") {
      this.bio.value = "";
      this.bioClose.nativeElement.style.display = "none";
      this.profile.biography = "";
    }
  }

  /* Nemo toggle selection function */
  toggleChange(option) {
    var editor = document.getElementById("editing");
    var profile = document.getElementById("profile");
    if (option == "edit") {
      editor.style.display = "flex";
      profile.style.display = "none";
    } else if (option == "view") {
      editor.style.display = "none";
      profile.style.display = "flex";
    }
  }

  ngOnDestroy() {
    this.ownPicturesSub.unsubscribe();
    this.profileSub.unsubscribe();
  }
}
