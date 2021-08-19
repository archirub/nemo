import { 
  Component, 
  OnInit, 
  Input, 
  Output, 
  EventEmitter } from '@angular/core';

import { 
  assetsInterestsPath, 
  Interests, 
  searchCriteriaOptions } from "@interfaces/index";

import { ModalController } from '@ionic/angular';

@Component({
  selector: 'app-interests-modal',
  templateUrl: './interests-modal.component.html',
  styleUrls: ['./interests-modal.component.scss'],
})
export class InterestsModalComponent implements OnInit {

  @Input() interests: Interests[];
  @Output() interestsChange = new EventEmitter<Interests[]>();

  pictures = assetsInterestsPath; //Interest icons
  names = searchCriteriaOptions.interests; //Interest names

  interestGrid: Array<Array<string>>
  pictureGrid: Array<Array<string>>

  viewReady: boolean = false;

  constructor(
    private modalCtrl: ModalController
  ) {}

  ngOnInit() {
    this.buildInterestGrid();
    this.viewReady = true;
  }

  buildInterestGrid() {
    this.interestGrid = []; //Array of arrays of interest triplets
    this.pictureGrid = []; //Arrays of icons to support

    let count = 0;
    let intPushArray = [];
    let picPushArray = [];

    this.names.forEach((interest, ind) => { //The index is to iterate simulatenously through pictures
      count++;

      if (count < 3) { //Push in twos
        intPushArray.push(interest);
        picPushArray.push(this.pictures[ind]);

      } else { //Move on to next array
        this.interestGrid.push(intPushArray); //Push the last two interests/pictures in one array
        this.pictureGrid.push(picPushArray);

        intPushArray = [interest]; //Start on next arrays
        picPushArray = [this.pictures[ind]];

        count = 1;
      }
    });

    if (intPushArray.length != 0) {
      this.interestGrid.push(intPushArray); //Pushes last interest array
    };
    if (picPushArray.length != 0) {
      this.pictureGrid.push(picPushArray); //Pushes last picture array
    };
  }


  async closeAndConfirmChoices() {
    return await this.modalCtrl.dismiss();
  }
}
