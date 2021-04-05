import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from "@angular/core";
import { IonSlides, IonContent, ModalController } from "@ionic/angular";
import { FormControl, FormGroup } from "@angular/forms";

import { Subscription } from "rxjs";

import { SearchCriteriaStore } from "@stores/search-criteria-store/search-criteria-store.service";
import { searchCriteriaOptions } from "@interfaces/search-criteria.model";
import { SearchCriteria } from "@classes/index";

import { AppToggleComponent } from "@components/index";

@Component({
  selector: "app-search-criteria",
  templateUrl: "./search-criteria.component.html",
  styleUrls: ["./search-criteria.component.scss"],
})
export class SearchCriteriaComponent implements OnInit, OnDestroy {
  @ViewChild("options", { read: ElementRef }) options: ElementRef;
  @ViewChild("clear", { read: ElementRef }) clear: ElementRef;
  @ViewChild("grid", { read: ElementRef }) grid: ElementRef;
  @ViewChild("locationslider") locationHandle: AppToggleComponent;
  @ViewChild("degreeslider") degreeHandle: AppToggleComponent;
  @ViewChild("modalSlides") modalSlides: IonSlides;
  @ViewChild(IonContent) frame: IonContent;

  searchCriteria$: Subscription;
  searchCriteria: SearchCriteria;
  scOptions = searchCriteriaOptions;

  degreeSelection: string;
  studySelection: string;
  societySelection: string;
  interestSelection: string;

  gridHeight: number;
  clearButtonHeight: number;
  optionsOriginalPos: number;

  viewEntered: boolean = false;

  searchCriteriaForm = new FormGroup({
    // university: new FormControl(" "),
    onCampus: new FormControl(null),
    degree: new FormControl(null),
    areaOfStudy: new FormControl(null),
    societyCategory: new FormControl(null),
    interest: new FormControl(null),
  });

  constructor(private SCstore: SearchCriteriaStore, private modalCtrl: ModalController) {}

  ngOnInit() {
    this.searchCriteria$ = this.SCstore.searchCriteria.subscribe({
      next: (sc) => {
        this.searchCriteriaForm.patchValue({
          onCampus: sc.onCampus,
          degree: sc.degree,
          areaOfStudy: sc.areaOfStudy,
          societyCategory: sc.societyCategory,
          interest: sc.interest,
        });
      },
    });
  }

  async ionViewDidEnter() {
    this.viewEntered = true;

    /* Timeout as elements don't exist until viewEntered set to true */
    setTimeout(() => {
      this.degreeHandle.selectOption("undergrad");
      this.locationHandle.selectOption("Everyone");
      this.modalSlides.lockSwipes(true);
      this.optionsOriginalPos = this.options.nativeElement.getBoundingClientRect().y;
      this.gridHeight = this.grid.nativeElement.getBoundingClientRect().height;
      this.updateCriteria();
      this.checkClear();
    }, 20);
  }

  slideDown() {
    this.options.nativeElement.style.transform = `translateY(${this.clearButtonHeight}px)`;
    this.options.nativeElement.style.transition = "0.4s ease-in-out";
    this.grid.nativeElement.style.height = `${
      this.gridHeight + this.clearButtonHeight + 20
    }px`;
  }

  slideUp() {
    this.options.nativeElement.style.transform = `translateY(0px)`;
    this.options.nativeElement.style.transition = "0.4s ease-in-out";
    this.grid.nativeElement.style.height = `${this.gridHeight}px`;
  }

  checkClear() {
    this.clearButtonHeight = this.clear.nativeElement.getBoundingClientRect().height;

    if (
      this.locationHandle.selection != "Everyone" ||
      this.degreeHandle.selection != "undergrad"
    ) {
      this.slideDown();
    } else if (
      this.studySelection != undefined ||
      this.societySelection != undefined ||
      this.interestSelection != undefined
    ) {
      this.slideDown();
    } else {
      this.slideUp();
    }

    this.searchCriteriaForm.value.onCampus = this.locationHandle.selection;
    this.searchCriteriaForm.value.degree = this.degreeHandle.selection;
  }

  updateCriteria() {
    if (this.locationHandle.selections.includes(this.searchCriteriaForm.value.onCampus)) {
      this.locationHandle.selectOption(this.searchCriteriaForm.value.onCampus);
    }

    if (this.degreeHandle.selections.includes(this.searchCriteriaForm.value.degree)) {
      this.degreeHandle.selectOption(this.searchCriteriaForm.value.degree);
    }

    if (this.scOptions.areaOfStudy.includes(this.searchCriteriaForm.value.areaOfStudy)) {
      this.selectReplace(this.searchCriteriaForm.value.areaOfStudy, "aos");
    }

    if (
      this.scOptions.societyCategory.includes(
        this.searchCriteriaForm.value.societySelection
      )
    ) {
      this.selectReplace(this.searchCriteriaForm.value.societySelection, "society");
    }

    if (this.scOptions.interest.includes(this.searchCriteriaForm.value.interests)) {
      this.selectReplace(this.searchCriteriaForm.value.interests, "interests");
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
  }

  async moveTo(name) {
    var placeholder = document.getElementById("placeholder");
    placeholder.style.display = "none";

    var slides = [
      document.getElementById("study"),
      document.getElementById("soc"),
      document.getElementById("int"),
    ];
    var names = ["studies", "societies", "interests"];

    for (let i = 0; i < names.length; i++) {
      if (name === names[i]) {
        slides[i].style.display = "block";
        this.unlockAndSwipe("next");
      }
    }

    const exit = document.getElementById("closeButton");
    exit.style.display = "none";
    this.frame.scrollToTop(100);
  }

  async returnTo() {
    var placeholder = document.getElementById("placeholder");
    var slides = [
      document.getElementById("study"),
      document.getElementById("soc"),
      document.getElementById("int"),
    ];

    this.unlockAndSwipe("prev");

    // Wait 0.2s to replace slides with placeholder so people don't see it disappear in the slide animation
    setTimeout(() => {
      placeholder.style.display = "block";
      slides.forEach((element) => {
        element.style.display = "none";
      });
    }, 200);

    const exit = document.getElementById("closeButton");
    exit.style.display = "block";

    this.checkClear();
  }

  selectReplace(option, label) {
    // Have to manually set here, cannot be done in for loop below
    if (label === "aos") {
      if (this.studySelection === option) {
        this.studySelection = undefined;
        this.resetFormat(label);
      } else {
        this.studySelection = option;
        this.searchCriteriaForm.value.areaOfStudy = this.studySelection;
        this.newFormat(label);
      }
    } else if (label === "society") {
      if (this.societySelection === option) {
        this.societySelection = undefined;
        this.resetFormat(label);
      } else {
        this.societySelection = option;
        this.searchCriteriaForm.value.societyCategory = this.societySelection;
        this.newFormat(label);
      }
    } else if (label === "interests") {
      if (this.interestSelection === option) {
        this.interestSelection = undefined;
        this.resetFormat(label);
      } else {
        this.interestSelection = option;
        this.searchCriteriaForm.value.interests = this.interestSelection;
        this.newFormat(label);
      }
    }
  }

  clearSelect() {
    // Clear ion-selects
    this.degreeSelection = undefined;

    this.studySelection = undefined;
    this.searchCriteriaForm.value.areaOfStudy = undefined;

    this.societySelection = undefined;
    this.searchCriteriaForm.value.societyCategory = undefined;

    this.interestSelection = undefined;
    this.searchCriteriaForm.value.interests = undefined;

    //Reset formatting of placeholders
    var names = ["aos", "society", "interests"];
    for (let i = 0; i < names.length; i++) {
      this.resetFormat(names[i]);
    }

    this.degreeHandle.selectOption("undergrad");
    this.locationHandle.selectOption("Everyone");

    this.slideUp();
  }

  resetFormat(section) {
    var names = ["aos", "society", "interests"];
    var sections = [
      document.getElementById("aos"),
      document.getElementById("society"),
      document.getElementById("interests"),
    ];

    for (let i = 0; i < sections.length; i++) {
      if (section == names[i]) {
        sections[i].style.marginTop = "1.9vh";
        sections[i].style.fontSize = "22px";
        sections[i].style.color = "var(--ion-color-light-contrast)";
        sections[i].style.top = "0";
        sections[i].style.position = "initial";
      }
    }
  }

  newFormat(section) {
    var names = ["aos", "society", "interests"];
    var sections = [
      document.getElementById("aos"),
      document.getElementById("society"),
      document.getElementById("interests"),
    ];

    for (let i = 0; i < sections.length; i++) {
      if (section == names[i]) {
        sections[i].style.marginTop = "0";
        sections[i].style.fontSize = "2vh";
        sections[i].style.color = "var(--ion-color-medium-shade)";
        sections[i].style.top = "2vh";
        sections[i].style.position = "absolute";
      }
    }
  }

  ngOnDestroy() {
    this.searchCriteria$.unsubscribe();
    this.viewEntered = false;
  }

  async closeAndConfirmChoices() {
    this.SCstore.addCriteria(this.searchCriteriaForm.value);
    return await this.modalCtrl.dismiss();
  }
}
