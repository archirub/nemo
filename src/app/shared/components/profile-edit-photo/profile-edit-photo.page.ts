import { Component, ElementRef, Input, OnInit, ViewChild } from "@angular/core";

@Component({
  selector: "app-profile-edit-photo",
  templateUrl: "./profile-edit-photo.page.html",
  styleUrls: ["./profile-edit-photo.page.scss"],
})
export class ProfileEditPhotoPage implements OnInit {
  constructor() {}

  ngOnInit() {}

  @ViewChild("icon", { read: ElementRef, static: true }) icon: ElementRef;
  @ViewChild("view", { read: ElementRef, static: true }) view: ElementRef;

  @Input() set url(value: string) {
    if (!this.view || !this.icon /*|| !this.text*/) return;
    const view = this.view.nativeElement;
    const icon = this.icon.nativeElement;
    //const text = this.text.nativeElement;

    // if new value of photodisplayed is empty, then that means look should be reverted back
    if (!value) {
      view.style.background = "var(--ion-color-light-tint)";
      icon.style.display = "inline";
      //text.style.display = "inline";
    } else {
      view.style.background = `url(${String(value)})`;
      view.style.backgroundSize = "cover";
      icon.style.display = "none";
      //text.style.display = "none";
    }
  }
}
