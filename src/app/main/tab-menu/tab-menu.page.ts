import { Component, ElementRef, OnInit, ViewChild } from "@angular/core";
import { IonTabs } from "@ionic/angular";

import { TabElementRefService } from "./tab-element-ref.service";

@Component({
  selector: "app-tab-menu",
  templateUrl: "./tab-menu.page.html",
  styleUrls: ["./tab-menu.page.scss"],
})
export class TabMenuPage implements OnInit {
  @ViewChild("tabs") tabs: IonTabs;
  @ViewChild("tabs", { read: ElementRef }) tabsContainer: ElementRef;
  @ViewChild("active", { read: ElementRef }) active: ElementRef;
  @ViewChild("inactive", { read: ElementRef }) inactive: ElementRef;

  constructor(private tabElementRef: TabElementRefService) {}

  ngOnInit() {}

  ngAfterViewInit() {
    this.colorFish();
    this.tabElementRef.tabRef = this.tabsContainer;
  }

  colorFish() {
    this.active.nativeElement.style.display = "none";
    this.inactive.nativeElement.style.display = "none";

    var selected = this.tabs.getSelected();

    if (selected === "home") {
      this.active.nativeElement.style.display = "block";
    } else {
      this.inactive.nativeElement.style.display = "block";
    }
  }
}
