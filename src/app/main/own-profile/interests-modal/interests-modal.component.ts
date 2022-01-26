import { Component, OnInit, Output, EventEmitter } from "@angular/core";

import {
  assetsInterestsPath,
  Interests,
  MAX_PROFILE_QUESTIONS_COUNT,
  searchCriteriaOptions,
} from "@interfaces/index";

import { ModalController } from "@ionic/angular";

@Component({
  selector: "app-interests-modal",
  templateUrl: "./interests-modal.component.html",
  styleUrls: ["./interests-modal.component.scss"],
})
export class InterestsModalComponent implements OnInit {
  pictures = assetsInterestsPath; //Interest icons
  names = searchCriteriaOptions.interests; //Interest names
  interests: Interests[] = [];

  //DO NOT REMOVE THESE - DEV TEST - SEE IF QUICKER WHEN HARDCODED
  interestGrid: Array<Array<string>> = [
    ["Herb Friendly", "Book Worm"],
    ["Life Saver", "Cafe Dweller"],
    ["Astrologist", "Chef"],
    ["Model", "Tik Toker"],
    ["Library Fiend", "Pub Crawler"],
    ["Math Geek", "Sports Knight"],
    ["Club Goer", "Casual Cupid"],
    ["Spiritual", "Activist"],
    ["Hopeless Romantic", "Radical"],
    ["Raver", "Music Nerd"],
  ];

  pictureGrid: Array<Array<string>> = [
    ["/assets/interests/herbfriendly.svg", "/assets/interests/bookworm.svg"],
    ["/assets/interests/lifesaver.svg", "/assets/interests/cafedweller.svg"],
    ["/assets/interests/astrologist.svg", "/assets/interests/chef.svg"],
    ["/assets/interests/model.svg", "/assets/interests/tiktoker.svg"],
    ["/assets/interests/libraryfiend.svg", "/assets/interests/pubcrawler.svg"],
    ["/assets/interests/mathgeek.svg", "/assets/interests/sportsknight.svg"],
    ["/assets/interests/clubgoer.svg", "/assets/interests/casualcupid.svg"],
    ["/assets/interests/spiritual.svg", "/assets/interests/activist.svg"],
    ["/assets/interests/hopelessromantic.svg", "/assets/interests/radical.svg"],
    ["/assets/interests/raver.svg", "/assets/interests/musicnerd.svg"],
  ];

  viewReady: boolean = false;

  @Output() interestsChange = new EventEmitter<Interests[]>();

  get reachedMaxInterestsCount(): boolean {
    return this.interestsCount >= MAX_PROFILE_QUESTIONS_COUNT;
  }

  get interestsCount(): number {
    return this.interests.length ?? 0;
  }

  getPicturePath(interestName: Interests): string {
    const formattedName = interestName.replace(/\s/g, "").toLowerCase();
    return "/assets/interests/" + formattedName + ".svg";
  }

  constructor(private modalCtrl: ModalController) {}

  ngOnInit() {
    //this.buildInterestGrid(); DO NOT REMOVE THIS
    this.viewReady = true;
  }

  async closeAndConfirmChoices() {
    return await this.modalCtrl.dismiss(this.interests);
  }

  //DO NOT REMOVE THIS - DEV TEST - SEE IF THERE IS AN IMPROVEMENT WHEN HARDCODED

  // builds the interest grid
  /*buildInterestGrid() {
    console.log('building');
    this.interestGrid = []; //Array of arrays of interest triplets
    this.pictureGrid = []; //Arrays of icons to support

    let count = 0;
    let intPushArray = [];
    let picPushArray = [];

    this.names.forEach((interest, ind) => {
      //The index is to iterate simulatenously through pictures
      count++;

      if (count < 3) {
        //Push in twos
        intPushArray.push(interest);
        picPushArray.push(this.getPicturePath(interest));
      } else {
        //Move on to next array
        this.interestGrid.push(intPushArray); //Push the last two interests/pictures in one array
        this.pictureGrid.push(picPushArray);

        intPushArray = [interest]; //Start on next arrays
        picPushArray = [this.getPicturePath(interest)];

        count = 1;
      }
    });

    if (intPushArray.length != 0) {
      this.interestGrid.push(intPushArray); //Pushes last interest array
    }
    if (picPushArray.length != 0) {
      this.pictureGrid.push(picPushArray); //Pushes last picture array
    }

    console.log(this.interestGrid);
    console.log(this.pictureGrid);
  }*/

  // changes the interest selection
  selectInterest(choice) {
    console.log("interests", this.interests);
    if (this.interests.includes(choice)) {
      const index = this.interests.indexOf(choice);
      this.interests.splice(index, 1);
    } else if (!this.reachedMaxInterestsCount) {
      this.interests.push(choice);
    }
  }
}
