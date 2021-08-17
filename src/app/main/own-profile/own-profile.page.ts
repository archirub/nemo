import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  Output,
  OnInit,
  QueryList,
  ViewChild,
  ViewChildren,
  EventEmitter
} from "@angular/core";

import { Observable, Subscription } from "rxjs";
import { Profile, User } from "@classes/index";
import { CurrentUserStore } from "@stores/index";
import { AddPhotoComponent, ProfileCardComponent } from "@components/index";
import { ProfileCourseComponent } from "./profile-course/profile-course.component";
import { IonTextarea } from "@ionic/angular";
import { Router } from "@angular/router";
import { OwnPicturesStore } from "@stores/pictures-stores/own-pictures-store/own-pictures.service";
import { ProfileAnswerComponent } from "./profile-answer/profile-answer.component";
import { FormArray, FormControl, FormGroup } from "@angular/forms";
import { FishSwimAnimation, ToggleAppearAnimation, ToggleDisappearAnimation } from "@animations/index";
import {
  AreaOfStudy,
  Interests,
  SocietyCategory,
} from "@interfaces/search-criteria.model";
import { QuestionAndAnswer } from "@interfaces/profile.model";
import { map } from "rxjs/operators";

interface editableProfileProperties {
  biography: string;
  course: string;
  areaOfStudy: AreaOfStudy;
  society: string;
  societyCategory: SocietyCategory;
  interests: Interests[];
  questions: QuestionAndAnswer[];
}

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
  @ViewChild('fish', { read: ElementRef }) fish: ElementRef;

  @ViewChildren("answers") answers: QueryList<ProfileAnswerComponent>;
  lastAnsRef;

  @ViewChild('toggleDiv', { read: ElementRef }) toggleDiv: ElementRef;

  @Output() loaded = new EventEmitter();

  profileSub: Subscription;
  profile: User; //THIS IS CHANGED ON THE PAGE WHILE EDITING, SEE prevProfileEdit

  ownPicturesSub: Subscription;
  picsLoaded$: Subscription;
  picsLoaded: boolean = false;

  fishSwimAnimation;

  toggleDivEnterAnimation;
  toggleDivLeaveAnimation;

  editingInProgress: boolean = false;
  prevProfileEdit: Profile; //THIS SHOULD ALWAYS BE MATCHING THE BACKEND

  form = new FormGroup({
    biography: new FormControl(null),
    course: new FormControl(null),
    areaOfStudy: new FormControl(null),
    society: new FormControl(null),
    societyCategory: new FormControl(null),
    interests: new FormArray([]),
    questions: new FormArray([
      new FormGroup({
        q: new FormControl(""),
        a: new FormControl(""),
      }),
    ]),
  });

  constructor(
    private currentUserStore: CurrentUserStore,
    private router: Router,
    private ownPicturesService: OwnPicturesStore,
    private detector: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.profileSub = this.currentUserStore.user$.subscribe(res => {
      this.profile = res;
      this.prevProfileEdit = Object.assign({}, this.profile);
      //Object.assign makes a deepcopy instead of a pointer
    });
    this.picsLoaded$ = this.ownPicturesService.allPicturesLoaded$.subscribe(res => {
      this.picsLoaded = res;
      if (this.picsLoaded === true) {
        try {
          this.stopAnimation();
        } finally {
          console.log('Animation not found.');
        };
      };
    });
  }

  ngAfterViewInit() {
    this.depts?.type ? (this.depts.type = "courses") : null;
    this.socs?.type ? (this.socs.type = "societies") : null;

    this.fishSwimAnimation = FishSwimAnimation(this.fish);
    this.fishSwimAnimation.play();
  }

  stopAnimation() {
    this.fishSwimAnimation.destroy();

    setTimeout(() => {
      // This is essentially a lifecycle hook for after the UI appears
      this.toggleDivEnterAnimation = ToggleAppearAnimation(this.toggleDiv, -5, 9.5);
      this.toggleDivLeaveAnimation = ToggleDisappearAnimation(this.toggleDiv, -5, 9.5);

      this.lastAnsRef = Array.from(this.answers)[this.answers.length - 1];

      //'snapshot' to retrieve if editing is cancelled
      this.prevProfileEdit['_questions'] = [...this.profile.questions];
      this.prevProfileEdit['_interests'] = [...this.profile.interests];
    }, 50);
  }

  activateFlowUserToForm(currentUser: Observable<User>): Observable<void> {
    return currentUser.pipe(
      map((user) => {
        Object.keys(this.form.controls).forEach((control) => {
          user?.[control] ? this.form.get(control).setValue(user[control]) : null;
        });
      })
    );
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

  updateInterests(targetProfile: Profile | User) {
    this.profileCard.buildInterestSlides(targetProfile);
    this.editingTriggered();
  }

  formatAllQuestions() {
    this.answers.forEach((comp) => {
      comp.formAvailableQuestions();
    });

    this.editingTriggered();
  }

  addQuestion() {
    this.lastAnsRef.addable = false; //Show input for new question on last profile answer component
    this.answers.last.chosenQuestion = undefined;
    this.answers.last.chosenAnswer = undefined;

    this.editingTriggered();
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

  editingTriggered() {
    if (this.editingInProgress === false) {
      this.toggleDivLeaveAnimation = ToggleDisappearAnimation(this.toggleDiv, -5, 9.5);
      this.toggleDivLeaveAnimation.play();

      setTimeout(() => {
        this.editingInProgress = true;
      }, 200);

      setTimeout(() => {
        this.toggleDivEnterAnimation = ToggleAppearAnimation(this.toggleDiv, -5, 9.5);
        this.toggleDivEnterAnimation.play();
      }, 250);
    };
  }

  /**
   * Fills question components with previous answers
   * Triggered by cancelling edits
   **/
  refillPrevAnswers() {
    this.prevProfileEdit['_questions'].forEach((q, ind) => {
      Array.from(this.answers)[ind].setValue(q.question, q.answer);
    });
  }

  /** 
   * Function for negotiating frontend/backend changes while editing
   * Triggered by the nemo toggle that appears when editing
   **/
  profileChanges(option) {
    if (option === 'save') {
      //Save user changes to backend
      //You want to send this.profile to backend as new changes, NOT PREVPROFILEEDIT 
      //No frontend changes necessary afaik, profile seems to update anyway?
      this.prevProfileEdit = Object.assign(this.prevProfileEdit, this.profile);
      console.log('Lol!');

    } else if (option === 'cancel') {
      //Bio is not a custom component so is manually updated here
      this.bio.value = this.prevProfileEdit['_biography'];
      this.displayExit('bio');

      this.profile.interests = this.prevProfileEdit['_interests'];

      this.profile = Object.assign(this.profile, this.prevProfileEdit);
      //Update last ans ref to add new questions
      this.lastAnsRef = Array.from(this.answers)[this.answers.length - 1];
      this.refillPrevAnswers();
    };

    //Copy profile interests and questions once again
    this.prevProfileEdit['_questions'] = [...this.profile.questions];
    this.prevProfileEdit['_interests'] = [...this.profile.interests];
    this.profileCard.buildInterestSlides(this.profile);

    this.toggleDivLeaveAnimation = ToggleDisappearAnimation(this.toggleDiv, -5, 9.5);
    this.toggleDivLeaveAnimation.play();

    setTimeout(() => {
      this.editingInProgress = false;
    }, 200);

    setTimeout(() => {
      this.toggleDivEnterAnimation = ToggleAppearAnimation(this.toggleDiv, -5, 9.5);
      this.toggleDivEnterAnimation.play();
    }, 250);
  }

  goToSettings() {
    this.router.navigateByUrl("/main/settings");
  }

  ngOnDestroy() {
    this.ownPicturesSub.unsubscribe();
    this.profileSub.unsubscribe();
  }
}
