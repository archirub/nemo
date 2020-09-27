import { Component, OnInit, OnDestroy } from "@angular/core";
import { ModalController } from "@ionic/angular";

import { Subscription } from "rxjs";

import { SearchCriteriaStore } from "@stores/search-criteria-store/search-criteria-store.service";
import { SCriteria } from "@interfaces/search-criteria.model";

@Component({
  selector: "app-search-criteria",
  templateUrl: "./search-criteria.component.html",
  styleUrls: ["./search-criteria.component.scss"],
})
export class SearchCriteriaComponent implements OnInit, OnDestroy {
  searchCriteria$: Subscription;
  searchCriteria: SCriteria;

  searchCriteriaOptions = {
    university: ["UCL", "LSE", "HAHA"],
  };

  constructor(
    private SCstore: SearchCriteriaStore,
    private modalCtrl: ModalController
  ) {}

  ngOnInit() {
    // instead, subscribe in the home component, and then transfer the data to this component
    this.searchCriteria$ = this.SCstore.searchCriteria.subscribe({
      next: (SC) => {
        this.searchCriteria = SC;
        console.log(this.searchCriteria);
      },
    });
  }

  ngOnDestroy() {
    this.searchCriteria$.unsubscribe();
  }

  async dismissModal() {
    return await this.modalCtrl.dismiss();
  }
}
