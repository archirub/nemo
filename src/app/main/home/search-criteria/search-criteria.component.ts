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

  placeholder = document.getElementById("placeholder");

  selectReplace(label) {
    var names = ["aos","society","interests"]
    var sections = [document.getElementById("aos"), document.getElementById("society"), document.getElementById("interests")];
    var corresponding = [this.studySelection, this.societySelection, this.interestSelection];

    // Note, checks if null (broadcast by clearSelect), if null then does not run
    for (let i = 0; i < sections.length; i++) {
      if (label==names[i] && corresponding[i] != "null") {
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
    this.degreeSelection = "null";
    this.studySelection = "null";
    this.societySelection = "null";
    this.interestSelection = "null";

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
