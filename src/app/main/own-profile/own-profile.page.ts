import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  OnInit,
  QueryList,
  ViewChild,
  ViewChildren,
} from "@angular/core";

import { Subscription } from "rxjs";
import { User } from "@classes/index";
import { CurrentUserStore } from "@stores/index";
import { AddPhotoComponent, ProfileCardComponent } from "@components/index";
import { ProfileCourseComponent } from "./profile-course/profile-course.component";
import { IonTextarea } from "@ionic/angular";
import { Router } from "@angular/router";
import { OwnPicturesStore } from "@stores/pictures-stores/own-pictures-store/own-pictures.service";
import { ProfileAnswerComponent } from "./profile-answer/profile-answer.component";

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

  @ViewChild("profileCard") profileCard: ProfileCardComponent;
  @ViewChild("profileContainer", { read: ElementRef }) profileContainer: ElementRef;

  @ViewChildren("answers") answers: QueryList<ProfileAnswerComponent>;
  lastAnsRef;

  // screenHeight: number;
  // screenWidth: number;

  // @HostListener("window:resize", ["$event"])
  // onResize() {
  //   this.screenHeight = window.innerHeight;
  //   this.screenWidth = window.innerWidth;
  // }

  // @HostListener("window:scroll", ["$event"])
  // onScroll(): void {
  //   console.log("load more");

  //   // if (window.innerHeight + window.scrollY >= document.body.offsetHeight) {
  //   //   console.log("load more");
  //   // }
  // }

  profileSub: Subscription;
  profile: User;

  ownPicturesSub: Subscription;

  constructor(
    private currentUserStore: CurrentUserStore,
    private router: Router,
    private ownPicturesService: OwnPicturesStore,
    private detector: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.ownPicturesSub = this.ownPicturesService.activateStore().subscribe();
    this.profileSub = this.currentUserStore.user$.subscribe(
      (profile) => (this.profile = profile)
    );
  }

  ngAfterViewInit() {
    this.depts.type = "courses";
    this.socs.type = "societies";
    this.lastAnsRef = Array.from(this.answers)[this.answers.length - 1];
  }

  goToSettings() {
    this.router.navigateByUrl("/main/settings");
  }

  displayExit(section) {
    if (section === "bio" && this.bio.value !== "") {
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

  buildInterests() {
    this.profileCard.buildInterestSlides();
  }

  formatAllQuestions() {
    this.answers.forEach((comp) => {
      comp.formAvailableQuestions();
    });
  }

  addQuestion() {
    this.lastAnsRef.addable = false; //Show input for new question on last profile answer component
    this.answers.last.chosenQuestion = undefined;
    this.answers.last.chosenAnswer = undefined;
  }

  submitQuestion() {
    this.lastAnsRef.submitQuestion();
    Array.from(this.answers).forEach((q) => {
      q.addable = true; //Remove all ion select options
    });

    this.detector.detectChanges(); //Detect template changes
    this.lastAnsRef = Array.from(this.answers)[this.answers.length - 1]; //Check which is now last answer element

    this.formatAllQuestions();
  }

  ngOnDestroy() {
    this.ownPicturesSub.unsubscribe();
    this.profileSub.unsubscribe();
  }
}
