import { Component, ElementRef, OnInit, ViewChild } from "@angular/core";

import { TabElementRefService } from "./tab-element-ref.service";

@Component({
  selector: "app-tab-menu",
  templateUrl: "./tab-menu.page.html",
  styleUrls: ["./tab-menu.page.scss"],
})
export class TabMenuPage implements OnInit {
  @ViewChild("tabs", { read: ElementRef }) tabsContainer: ElementRef;

  constructor(private tabElementRef: TabElementRefService) {}

  ngOnInit() {}

  ngAfterViewInit() {
    this.tabElementRef.tabRef = this.tabsContainer;
  }
}
