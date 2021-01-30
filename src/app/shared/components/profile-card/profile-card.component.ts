import { Component, Input, OnInit, ViewChild } from "@angular/core";
import { Chat, Profile } from "@classes/index";
import { IonContent } from "@ionic/angular";

@Component({
  selector: "app-profile-card",
  templateUrl: "./profile-card.component.html",
  styleUrls: ["./profile-card.component.scss"],
})
export class ProfileCardComponent implements OnInit {
  @Input() moreInfo: boolean;
  @Input() profile: Profile[];
  @ViewChild(IonContent) ionContent: IonContent;
  constructor() {}

  ngOnInit() {
    this.moreInfo = false;
  }

  expandProfile(event) {
    if (this.moreInfo == true) this.moreInfo = false;
    else this.moreInfo = true;
  }
}
