import { Component, OnInit, ViewChild, Renderer2 } from "@angular/core";
import { Profile } from "@interfaces/profile";
import { FakeDataService } from "@services/fake-data/fake-data.service";

import { IonContent } from '@ionic/angular';

@Component({
  selector: "app-chats",
  templateUrl: "./chats.page.html",
  styleUrls: ["./chats.page.scss"],
})

export class ChatsPage implements OnInit {
  @ViewChild(IonContent) ionContent: IonContent;
  allProfiles: Profile[];
  chips: Profile[];
  searchResults: Profile[];
  displayedProfiles: Profile[];

  profileCount: number; 
  scrollTopSpeed: number;
  searching: boolean;
  filtered: boolean; 

  constructor(private fakeData: FakeDataService) {}

  ngOnInit() {
    this.allProfiles = this.fakeData.generateProfiles(20);
    this.chips = this.allProfiles.slice(15,20);
    this.displayedProfiles = this.allProfiles;
    this.profileCount = this.allProfiles.length;
    this.scrollTopSpeed = this.profileCount * 45; //so the relative speed is always the same
    this.searching = false;
    this.filtered = false;
  }

  filterProfiles(event) {
    if(this.filtered == true) {
      this.filtered = false;
    } else {
      this.filtered = true
    }
    console.log("filter status " + this.filtered);
  }

  onSearch(event) {
    if(this.searching != true) {
      this.searching = true;
    }
    let searchInput: string = event.target.value;
    this.searchResults = this.allProfiles.filter(profile => {
      return (profile.firstName.toLowerCase().startsWith(searchInput.toLowerCase()))
    });
    console.log(this.searchResults);
    this.displayedProfiles = this.searchResults;
  }

  toggleSearching(event) {
    this.searching = false;
    console.log(this.searching);
    this.searchResults = [];
    this.displayedProfiles = this.allProfiles;
  }

  onScrollDown() {
  }

  scrollToTop() {
    this.ionContent.scrollToTop(this.scrollTopSpeed);
  }
}
