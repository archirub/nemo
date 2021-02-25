import { Component, ElementRef, Input, Output, OnInit, ViewChild, EventEmitter } from "@angular/core";
import { Chat, Profile } from "@classes/index";
import { IonContent } from "@ionic/angular";

@Component({
  selector: "app-profile-card",
  templateUrl: "./profile-card.component.html",
  styleUrls: ["./profile-card.component.scss"],
})
export class ProfileCardComponent implements OnInit {
  @Output() expanded = new EventEmitter();
  @Input() moreInfo: boolean;
  @Input() profile: Profile[];
  @ViewChild(IonContent) ionContent: IonContent;

  //for sizing on chats page
  @ViewChild('snippet', { read: ElementRef }) snippet: ElementRef;
  @ViewChild('complete', { read: ElementRef, static: false }) complete: ElementRef;
  @ViewChild('pic', { read: ElementRef }) picture: ElementRef;
  @ViewChild('name', { read: ElementRef }) name: ElementRef;
  @ViewChild('department', { read: ElementRef }) department: ElementRef;
  @ViewChild('header', { read: ElementRef }) header: ElementRef;

  constructor() {}

  ngOnInit() {
    this.moreInfo = false;
  }

  expandProfile() {
    if (this.moreInfo == true) {
      this.moreInfo = false;
    } else {
      this.moreInfo = true;
    };
    this.expanded.emit(this.moreInfo);
  }
}
