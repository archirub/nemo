import { Component, OnInit, OnDestroy, ViewChild } from "@angular/core";
import { IonToggle, ModalController } from "@ionic/angular";
import { FormControl, FormGroup } from "@angular/forms";

import { Subscription } from "rxjs";

import { SearchCriteriaStore } from "@stores/search-criteria-store/search-criteria-store.service";
import { searchCriteriaOptions } from "@interfaces/search-criteria.model";
import { SearchCriteria } from "@classes/index";

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

  @ViewChild("toggler") toggle: IonToggle;

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

  /* Toggle button changes */
  locationSwitch() {
    // Change colors of on/off campus labels
    var labels:any = document.getElementsByClassName("on-off")
    for (let i = 0; i < labels.length; i++) {
      let toggle = labels[i];
      if (toggle.style.color == "var(--ion-color-primary)") {
        toggle.style.color = "var(--ion-color-light-contrast)";
      } else {
        toggle.style.color = "var(--ion-color-primary)";
      };
    }
  }

  selectReplace(label) {
    var deg = document.getElementById("degree");
    var aos = document.getElementById("aos");
    var soc = document.getElementById("society");
    var ints = document.getElementById("interests");

    // Note, checks if null (broadcast by clearSelect), if null then does not run
    if (label=="degree" && this.degreeSelection != "null") {
      deg.style.display = "none";
    } else if (label=="aos" && this.studySelection != "null") {
      aos.style.display = "none";
    } else if (label=="society" && this.societySelection != "null") {
      soc.style.display = "none";
    } else if (label=="interests" && this.interestSelection != "null") {
      ints.style.display = "none";
    } else {
      console.log("Error in HTML - trying to hide non-existent ID")
    };
  }

  clearSelect() {
    // Clear ion-selects
    this.degreeSelection = "null";
    this.studySelection = "null";
    this.societySelection = "null";
    this.interestSelection = "null";

    // Get placeholder names
    var deg = document.getElementById("degree");
    var aos = document.getElementById("aos");
    var soc = document.getElementById("society");
    var ints = document.getElementById("interests");

    // Display placeholder names
    if (deg.style.display == "none") {
    deg.style.display = "block"; };
    if (aos.style.display == "none") {
    aos.style.display = "block"; };
    if (soc.style.display == "none") {
    soc.style.display = "block"; };
    if (ints.style.display == "none") {
    ints.style.display = "block"; };
    if (this.toggle.checked == true) {
    this.toggle.checked = false ; };
  }

  ngOnDestroy() {
    this.searchCriteria$.unsubscribe();
  }

  async closeAndConfirmChoices() {
    this.SCstore.addCriteria(this.searchCriteriaForm.value);
    return await this.modalCtrl.dismiss();
  }
}
