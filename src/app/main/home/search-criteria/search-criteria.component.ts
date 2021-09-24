import { UniversitiesStore } from "@stores/universities/universities.service";
import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  Renderer2,
} from "@angular/core";
import { IonSlides, IonContent, ModalController } from "@ionic/angular";
import { FormControl, FormGroup } from "@angular/forms";

import { Observable, Subscription } from "rxjs";

import { SearchCriteriaStore } from "@stores/search-criteria/search-criteria-store.service";
import { searchCriteria, searchCriteriaOptions } from "@interfaces/search-criteria.model";
import { SearchCriteria } from "@classes/index";

import { AppToggleComponent } from "@components/index";
import { UniversityName } from "@interfaces/universities.model";
import { map } from "rxjs/operators";
import { tap } from "lodash";

@Component({
  selector: "app-search-criteria",
  templateUrl: "./search-criteria.component.html",
  styleUrls: ["./search-criteria.component.scss"],
})
export class SearchCriteriaComponent implements OnInit, OnDestroy {
  @ViewChild("options", { read: ElementRef }) options: ElementRef;
  @ViewChild("clear", { read: ElementRef }) clear: ElementRef;
  @ViewChild("grid", { read: ElementRef }) grid: ElementRef;
  // @ViewChild("locationslider") locationHandle: AppToggleComponent;
  @ViewChild("degreeSlider") degreeHandle: AppToggleComponent;
  @ViewChild("universitySlider") universityHandle: AppToggleComponent;
  @ViewChild("modalSlides") modalSlides: IonSlides;
  @ViewChild("modalSlides", { read: ElementRef }) slidesRef: ElementRef;
  @ViewChild(IonContent) frame: IonContent;

  searchCriteriaSub: Subscription;
  searchCriteria: SearchCriteria;

  nameOfUnselected = "none";

  degreeOptions = searchCriteriaOptions.degree;
  areaOfStudyOptions = searchCriteriaOptions.areaOfStudy;
  societyCategoryOptions = searchCriteriaOptions.societyCategory;
  interestsOptions = searchCriteriaOptions.interests;
  get universityOptions$() {
    return this.universitiesStore.optionsList$.pipe();
  }
  // onCampus = searchCriteriaOptions.onCampus

  uniSelection: string;
  degreeSelection: string;
  studySelection: string;
  societySelection: string;
  interestSelection: string;

  gridHeight: number;
  clearButtonHeight: number;
  optionsOriginalPos: number;

  viewEntered: boolean = false;

  form: FormGroup;

  get emptyForm() {
    return new FormGroup({
      university: new FormControl(null),
      // onCampus: new FormControl(null),
      degree: new FormControl(null),
      areaOfStudy: new FormControl(null),
      societyCategory: new FormControl(null),
      interests: new FormControl(null),
    });
  }

  constructor(
    private SCstore: SearchCriteriaStore,
    private modalCtrl: ModalController,
    private universitiesStore: UniversitiesStore,
    private renderer: Renderer2
  ) {
    this.form = this.emptyForm;
  }

  ngOnInit() {
    /*this.fishSwimAnimation = FishSwimAnimation(this.fish);
    
    this.fishSwimAnimation.play();*/

    this.searchCriteriaSub = this.SCstore.searchCriteria$.subscribe({
      next: (sc) => {
        this.form.patchValue(
          this.searchCriteriaToTemplateFormatting({
            // onCampus: sc.onCampus,
            university: sc.university,
            degree: sc.degree,
            areaOfStudy: sc.areaOfStudy,
            societyCategory: sc.societyCategory,
            interests: sc.interests,
          })
        );
      },
    });
  }

  async ionViewDidEnter() {
    //This initialises slide heights, for some unknown reason
    //USER DOESN'T SEE THIS, KEEP IT HERE
    this.moveTo("studies").then(() => this.returnTo());
    this.modalSlides.lockSwipes(true);
    this.optionsOriginalPos = this.options.nativeElement.getBoundingClientRect().y;
    this.gridHeight = this.grid.nativeElement.getBoundingClientRect().height;
    this.updateCriteria();
    this.checkClear();

    // setTimeout to allow for the time for the template to be setup (particularly for
    // the nemo-toggle animations to play out)
    setTimeout(() => {
      this.viewEntered = true;
    }, 350);
  }

  slideDown() {
    this.renderer.setStyle(
      this.options.nativeElement,
      "transform",
      `translateY(${this.clearButtonHeight}px)`
    );
    this.renderer.setStyle(this.options.nativeElement, "transition", "0.4s ease-in-out");
    this.renderer.setStyle(
      this.grid.nativeElement,
      "height",
      `${this.gridHeight + this.clearButtonHeight + 20}px`
    );
  }

  slideUp() {
    this.renderer.setStyle(this.options.nativeElement, "transform", `translateY(0px)`);
    this.renderer.setStyle(this.options.nativeElement, "transition", "0.4s ease-in-out");
    this.renderer.setStyle(this.grid.nativeElement, "height", `${this.gridHeight}px`);
  }

  checkClear() {
    this.clearButtonHeight = this.clear.nativeElement.getBoundingClientRect().height;

    //if (
    // this.locationHandle.value != "Everyone" ||
    //this.degreeHandle.value != "undergrad"
    //) {
    //  this.slideDown();
    if (
      this.uniSelection != undefined ||
      this.degreeSelection != undefined ||
      this.studySelection != undefined ||
      this.societySelection != undefined ||
      this.interestSelection != undefined
    ) {
      this.slideDown();
    } else {
      this.slideUp();
    }

    //console.log("uni value is ", this.universityHandle.value);
    // this.searchCriteriaForm.value.onCampus = this.locationHandle.value;
    //this.form.value.degree = this.degreeHandle.value;
    //this.form.value.university = this.universityHandle.value;
  }

  updateCriteria() {
    // if (this.locationHandle.selections.includes(this.searchCriteriaForm.value.onCampus)) {
    //   switch (this.searchCriteriaForm.value.onCampus) {
    //     case true:
    //       this.locationHandle.selectOption("On Campus");
    //       break;
    //     case false:
    //       this.locationHandle.selectOption("Everyone");
    //       break;
    //   }
    // }

    //Sort of need to use the pipe here
    if (this.form.value.university != this.nameOfUnselected) {
      this.selectReplace(this.form.value.university, "chosenUni");
    }

    if (this.degreeOptions.includes(this.form.value.degree)) {
      this.selectReplace(this.form.value.degree, "chosenDegree");
    }

    /*if (this.degreeHandle.selections.includes(this.form.value.degree)) {
      this.degreeHandle.selectOption(this.form.value.degree);
    }

    if (this.universityHandle.selections.includes(this.form.value.university)) {
      this.universityHandle.selectOption(this.form.value.university);
    }*/

    if (this.areaOfStudyOptions.includes(this.form.value.areaOfStudy)) {
      this.selectReplace(this.form.value.areaOfStudy, "areaOfStudy");
    }

    if (this.societyCategoryOptions.includes(this.form.value.societyCategory)) {
      this.selectReplace(this.form.value.societyCategory, "society");
    }

    if (this.interestsOptions.includes(this.form.value.interests)) {
      this.selectReplace(this.form.value.interests, "interests");
    }

    this.checkClear();
  }

  /* Unlocks swipes, slides to next/prev and then locks swipes */
  async unlockAndSwipe(direction) {
    this.modalSlides.lockSwipes(false);

    if (direction === "next") {
      this.modalSlides.slideNext();
    } else {
      this.modalSlides.slidePrev();
    }

    this.modalSlides.lockSwipes(true);
    this.modalSlides.update();
  }

  async moveTo(name) {
    const placeholder = document.getElementById("placeholder");
    this.renderer.setStyle(placeholder, "display", "none");

    const slides = [
      document.getElementById("uni"),
      document.getElementById("deg"),
      document.getElementById("study"),
      document.getElementById("soc"),
      document.getElementById("int"),
    ];
    const names = ["university", "degree", "studies", "societies", "interests"];

    for (let i = 0; i < names.length; i++) {
      if (name === names[i]) {
        this.renderer.setStyle(slides[i], "display", "block");
        await this.unlockAndSwipe("next");
      }
    }

    const exit = document.getElementById("closeButton");
    this.renderer.setStyle(exit, "display", "none");
    this.frame.scrollToTop(100);
  }

  async returnTo() {
    var placeholder = document.getElementById("placeholder");
    var slides = [
      document.getElementById("uni"),
      document.getElementById("deg"),
      document.getElementById("study"),
      document.getElementById("soc"),
      document.getElementById("int"),
    ];

    this.unlockAndSwipe("prev");

    // Wait 0.2s to replace slides with placeholder so people don't see it disappear in the slide animation
    setTimeout(() => {
      this.renderer.setStyle(placeholder, "display", "block");
      slides.forEach((element) => {
        this.renderer.setStyle(element, "display", "none");
      });
    }, 200);

    const exit = document.getElementById("closeButton");
    this.renderer.setStyle(exit, "display", "block");

    this.checkClear();
  }

  selectReplace(option, label) {
    // Have to manually set here, cannot be done in for loop below
    // You can't index them to arrays or objects because you end up just changing the object
    // You can't reach the pointed variable
    // e.g. { "chosenUni": this.uniSelection }
    // You can access the value of this.uniSelection by this but can't change it
    // Please someone find a better way to do this because this is disgusting code

    if (label === "chosenUni") {
      if (this.uniSelection === option) {
        this.uniSelection = undefined;
        this.resetFormat(label);
      } else {
        this.uniSelection = option;
        this.newFormat(label);
      }
      this.form.value.university = this.uniSelection;
    } else if (label === "chosenDegree") {
      if (this.degreeSelection === option) {
        this.degreeSelection = undefined;
        this.resetFormat(label);
      } else {
        this.degreeSelection = option;
        this.newFormat(label);
      }
      this.form.value.degree = this.degreeSelection;
    } else if (label === "areaOfStudy") {
      if (this.studySelection === option) {
        this.studySelection = undefined;
        this.resetFormat(label);
      } else {
        this.studySelection = option;
        this.newFormat(label);
      }
      this.form.value.areaOfStudy = this.studySelection;
    } else if (label === "society") {
      if (this.societySelection === option) {
        this.societySelection = undefined;
        this.resetFormat(label);
      } else {
        this.societySelection = option;
        this.newFormat(label);
      }
      this.form.value.societyCategory = this.societySelection;
    } else if (label === "interests") {
      if (this.interestSelection === option) {
        this.interestSelection = undefined;
        this.resetFormat(label);
      } else {
        this.interestSelection = option;
        this.newFormat(label);
      }
      this.form.value.interests = this.interestSelection;
    }
  }

  clearSelect() {
    // Clear ion-selects

    this.uniSelection = undefined;
    this.form.value.university = undefined;

    this.degreeSelection = undefined;
    this.form.value.degree = undefined;

    this.studySelection = undefined;
    this.form.value.areaOfStudy = undefined;

    this.societySelection = undefined;
    this.form.value.societyCategory = undefined;

    this.interestSelection = undefined;
    this.form.value.interests = undefined;

    //Reset formatting of placeholders
    var names = ["chosenUni", "chosenDegree", "areaOfStudy", "society", "interests"];
    for (let i = 0; i < names.length; i++) {
      this.resetFormat(names[i]);
    }

    //this.degreeHandle.selectOption(this.nameOfUnselected);
    //this.universityHandle.selectOption(this.nameOfUnselected); // this.locationHandle.selectOption("Everyone");

    this.slideUp();
  }

  resetFormat(section) {
    //Orders must match
    var names = ["chosenUni", "chosenDegree", "areaOfStudy", "society", "interests"];
    var sections = [
      document.getElementById("chosenUni"),
      document.getElementById("chosenDegree"),
      document.getElementById("areaOfStudy"),
      document.getElementById("society"),
      document.getElementById("interests"),
    ];

    for (let i = 0; i < sections.length; i++) {
      if (section == names[i]) {
        this.renderer.setStyle(sections[i], "marginTop", "1.9vh");
        this.renderer.setStyle(sections[i], "fontSize", "18px");
        this.renderer.setStyle(sections[i], "color", "var(--ion-color-light-contrast)");
        this.renderer.setStyle(sections[i], "top", "0");
        this.renderer.setStyle(sections[i], "position", "initial");
      }
    }
  }

  newFormat(section) {
    //Orders must match
    var names = ["chosenUni", "chosenDegree", "areaOfStudy", "society", "interests"];
    var sections = [
      document.getElementById("chosenUni"),
      document.getElementById("chosenDegree"),
      document.getElementById("areaOfStudy"),
      document.getElementById("society"),
      document.getElementById("interests"),
    ];

    for (let i = 0; i < sections.length; i++) {
      if (section == names[i]) {
        this.renderer.setStyle(sections[i], "marginTop", "0");
        this.renderer.setStyle(sections[i], "fontSize", "2vh");
        this.renderer.setStyle(sections[i], "color", "var(--ion-color-medium-shade)");
        this.renderer.setStyle(sections[i], "top", "2vh");
        this.renderer.setStyle(sections[i], "position", "absolute");
      }
    }
  }

  ngOnDestroy() {
    this.searchCriteriaSub.unsubscribe();
    this.viewEntered = false;
  }

  async closeAndConfirmChoices() {
    await this.SCstore.updateCriteriaStore(
      this.searchCriteriaToStoreFormatting(this.form.value)
    );
    await this.SCstore.updateCriteriaOnDatabase();
    await this.modalCtrl.dismiss();
  }

  searchCriteriaToStoreFormatting(SCForm: FormGroup): SearchCriteria {
    const formattedSC = {};

    Object.entries(this.form.value as searchCriteria).forEach(([key, value]) => {
      if (value === this.nameOfUnselected) {
        formattedSC[key] = null;
      } else if (value === undefined) {
        formattedSC[key] = null;
      } else {
        formattedSC[key] = value;
      }
    });

    return formattedSC as SearchCriteria;
  }

  searchCriteriaToTemplateFormatting(SC: searchCriteria) {
    const formattedSC = {};

    Object.entries(SC).forEach(([key, value]) => {
      if (value == null && ["degree", "university"].includes(key)) {
        formattedSC[key] = this.nameOfUnselected;
      } else {
        formattedSC[key] = value;
      }
    });

    return formattedSC;
  }
}
