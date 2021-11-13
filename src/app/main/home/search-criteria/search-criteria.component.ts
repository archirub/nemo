import { IonSlides, IonContent, ModalController } from "@ionic/angular";
import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  Renderer2,
} from "@angular/core";
import { FormControl, FormGroup } from "@angular/forms";

import { Subscription, tap } from "rxjs";

import { SearchCriteriaStore } from "@stores/search-criteria/search-criteria-store.service";
import { UniversitiesStore } from "@stores/universities/universities.service";

import { SearchCriteria } from "@classes/index";
import { searchCriteria, searchCriteriaOptions } from "@interfaces/search-criteria.model";

@Component({
  selector: "app-search-criteria",
  templateUrl: "./search-criteria.component.html",
  styleUrls: ["./search-criteria.component.scss"],
})
export class SearchCriteriaComponent implements OnInit, OnDestroy {
  UNSELECTED_NAME = "none";
  gridHeight: number;
  clearButtonHeight: number;
  optionsOriginalPos: number;
  viewEntered: boolean = false;
  form: FormGroup;

  degreeOptions = searchCriteriaOptions.degree;
  areaOfStudyOptions = searchCriteriaOptions.areaOfStudy;
  societyCategoryOptions = searchCriteriaOptions.societyCategory;
  interestsOptions = searchCriteriaOptions.interests;

  uniSelection: string;
  degreeSelection: string;
  studySelection: string;
  societySelection: string;
  interestSelection: string;

  private subs = new Subscription();

  @ViewChild("options", { read: ElementRef }) options: ElementRef;
  @ViewChild("clear", { read: ElementRef }) clear: ElementRef;
  @ViewChild("grid", { read: ElementRef }) grid: ElementRef;
  @ViewChild("modalSlides") modalSlides: IonSlides;
  @ViewChild(IonContent) frame: IonContent;

  universityOptions$ = this.universitiesStore.optionsList$;

  searchCriteriaHandler$ = this.SCstore.searchCriteria$.pipe(
    tap((sc) =>
      this.form.patchValue(
        this.searchCriteriaToTemplateFormatting({
          university: sc.university,
          degree: sc.degree,
          areaOfStudy: sc.areaOfStudy,
          societyCategory: sc.societyCategory,
          interests: sc.interests,
        })
      )
    )
  );

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
    this.subs.add(this.searchCriteriaHandler$.subscribe());
  }

  ionViewDidEnter() {
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

  // saves the new choices to the store, as well as to the database, and then closes the modal
  async closeAndConfirmChoices() {
    await this.SCstore.updateCriteriaInStore(
      this.searchCriteriaToStoreFormatting(this.form.value)
    );
    await this.SCstore.updateCriteriaOnDatabase();
    await this.modalCtrl.dismiss();
  }

  // checks whether any of the options are not empty. If it is the case, then show the button to reset the selections
  checkClear() {
    this.clearButtonHeight = this.clear.nativeElement.getBoundingClientRect().height;

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
  }

  // slides down to show the "clear selection" button
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

  // slides up to hide the "clear selection" button
  slideUp() {
    this.renderer.setStyle(this.options.nativeElement, "transform", `translateY(0px)`);
    this.renderer.setStyle(this.options.nativeElement, "transition", "0.4s ease-in-out");
    this.renderer.setStyle(this.grid.nativeElement, "height", `${this.gridHeight}px`);
  }

  // checks each field of the form, and if it contains a value, update that value in the main SC page
  // this seems to only be used on init of the SC component
  updateCriteria() {
    //Sort of need to use the pipe here
    if (this.form.value.university != this.UNSELECTED_NAME) {
      this.selectReplace(this.form.value.university, "chosenUni");
    }

    if (this.degreeOptions.includes(this.form.value.degree)) {
      this.selectReplace(this.form.value.degree, "chosenDegree");
    }

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

  // to move to the selection page for a certain property
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
        break;
      }
    }

    const exit = document.getElementById("closeButton");
    this.renderer.setStyle(exit, "display", "none");
    this.frame.scrollToTop(100);
  }

  // to return to main SC
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

  // This is used to either change the selection of a given category, or to
  // unselect that selection
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

  // this is used to clear all selections
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

    this.slideUp();
  }

  // this is used to reset the format of the search criteria
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

  // this is used when a new selection has been made, to reformat the category it concerns
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

  searchCriteriaToStoreFormatting(SCForm: FormGroup): SearchCriteria {
    const formattedSC = {};

    Object.entries(this.form.value as searchCriteria).forEach(([key, value]) => {
      if (value === this.UNSELECTED_NAME) {
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
        formattedSC[key] = this.UNSELECTED_NAME;
      } else {
        formattedSC[key] = value;
      }
    });

    return formattedSC;
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
    this.viewEntered = false;
  }
}
