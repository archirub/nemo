import { Component, OnInit, OnDestroy, ViewChild, AfterViewInit } from "@angular/core";
import { IonSlides, IonToggle, ModalController } from "@ionic/angular";
import { FormControl, FormGroup } from "@angular/forms";

import { Subscription } from "rxjs";

import { SearchCriteriaStore } from "@stores/search-criteria-store/search-criteria-store.service";
import { searchCriteriaOptions } from "@interfaces/search-criteria.model";
import { SearchCriteria } from "@classes/index";

import { AppToggleComponent } from "@components/index";
import { App } from "@capacitor/core";

@Component({
  selector: "app-search-criteria",
  templateUrl: "./search-criteria.component.html",
  styleUrls: ["./search-criteria.component.scss"],
})
export class SearchCriteriaComponent implements OnInit, OnDestroy {
  searchCriteria$: Subscription;
  searchCriteria: SearchCriteria;
  scOptions = searchCriteriaOptions;

  degreeSelection: string;
  studySelection: string;
  societySelection: string;
  interestSelection: string;


  searchCriteriaForm = new FormGroup({
    // university: new FormControl(" "),
    onCampus: new FormControl(null),
    degree: new FormControl(null),
    areaOfStudy: new FormControl(null),
    societyCategory: new FormControl(null),
    interest: new FormControl(null),
  });

  constructor(private SCstore: SearchCriteriaStore, private modalCtrl: ModalController) {}

  @ViewChild("locationslider") locationHandle: AppToggleComponent;
  @ViewChild("degreeslider") degreeHandle: AppToggleComponent;
  @ViewChild("slides") slides: IonSlides;

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

  ngAfterViewInit() {
    this.degreeHandle.selectOption("both");
    this.locationHandle.selectOption("everyone");
    this.slides.lockSwipes(true);
  }

  /* Unlocks swipes, slides to next/prev and then locks swipes */
  unlockAndSwipe(direction) {
    this.slides.lockSwipes(false);
  
    if (direction == "next") {
      this.slides.slideNext();
    } else {
      this.slides.slidePrev();
    };
  
    this.slides.lockSwipes(true);
  }

  moveTo(name) {
    var placeholder = document.getElementById("placeholder");
    placeholder.style.display = "none";

    var slides = [document.getElementById("study"), document.getElementById("soc"), document.getElementById("int")];
    var names = ["studies", "societies", "interests"];

    for (let i = 0; i < names.length; i++) {
      if (name === names[i]) {
        slides[i].style.display = "block";
        this.unlockAndSwipe("next");
      }
    }
  }

  returnTo() {
    var placeholder = document.getElementById("placeholder");
    var slides = [document.getElementById("study"), document.getElementById("soc"), document.getElementById("int")];
    var names = ["aos", "society", "interests"];

    /*names.forEach(element => {
      this.selectReplace(element);
    });*/

    this.unlockAndSwipe("prev");

    // Wait 0.2s to replace slides with placeholder so people don't see it disappear in the slide animation
    setTimeout(() => { 
      placeholder.style.display = "block";
      slides.forEach(element => {
        element.style.display = "none"
      });
    }, 200);
  }

  selectReplace(option, label) {
    var names = ["aos","society","interests"]
    var sections = [document.getElementById("aos"), document.getElementById("society"), document.getElementById("interests")];

    // Have to manually set here, cannot be done in for loop below
    if (label==="aos") {
      this.studySelection = option;
    } else if (label==="society") {
      this.societySelection = option;
    } else if (label==="interests") {
      this.interestSelection = option;
    };

    for (let i = 0; i < sections.length; i++) {
      if (label==names[i]) {
        sections[i].style.marginTop = "0";
        sections[i].style.fontSize = "2vh";
        sections[i].style.color = "var(--ion-color-medium-shade)";
        sections[i].style.top = "2vh";
        sections[i].style.position = "absolute";
      };
    }
  }

  clearSelect() {
    // Clear ion-selects
    this.degreeSelection = undefined;
    this.studySelection = undefined;
    this.societySelection = undefined;
    this.interestSelection = undefined;

    var sections = [document.getElementById("aos"), document.getElementById("society"), document.getElementById("interests")];

    // Reset formatting of placeholders
    for (let i = 0; i < sections.length; i++) {
      sections[i].style.marginTop = "1.9vh";
      sections[i].style.fontSize = "2.7vh";
      sections[i].style.color = "var(--ion-color-light-contrast)";
      sections[i].style.top = "0";
      sections[i].style.position = "initial";
    };

    this.degreeHandle.selectOption("both");
    this.locationHandle.selectOption("everyone");
  }

  ngOnDestroy() {
    this.searchCriteria$.unsubscribe();
  }

  async closeAndConfirmChoices() {
    this.SCstore.addCriteria(this.searchCriteriaForm.value);
    return await this.modalCtrl.dismiss();
  }
}
