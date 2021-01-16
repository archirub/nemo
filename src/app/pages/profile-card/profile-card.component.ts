import { Component, Input, OnInit, ViewChild } from "@angular/core";
import { Chat } from "@classes/index";
import { IonContent } from "@ionic/angular";

@Component({
  selector: "app-profile-card",
  templateUrl: "./profile-card.component.html",
  styleUrls: ["./profile-card.component.scss"],
})
export class ProfileCardComponent implements OnInit {
  @Input() moreInfo: boolean;
  @ViewChild(IonContent) ionContent: IonContent;
  constructor() {}

  ngOnInit() {
    this.moreInfo = false;
  }

  expandProfile(event) {
    console.log("the button works");
    if (this.moreInfo == true) this.moreInfo = false;
    else this.moreInfo = true;
  }
}
