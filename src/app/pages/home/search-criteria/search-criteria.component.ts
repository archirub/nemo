import { Component, OnInit, OnDestroy } from "@angular/core";
import { ModalController } from "@ionic/angular";
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

  ngOnDestroy() {
    this.searchCriteria$.unsubscribe();
  }

  async closeAndConfirmChoices() {
    this.SCstore.addCriteria(this.searchCriteriaForm.value);
    return await this.modalCtrl.dismiss();
  }
}
