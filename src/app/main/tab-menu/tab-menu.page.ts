import { Component, ElementRef, OnInit, Renderer2, ViewChild } from "@angular/core";
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

  constructor(private tabElementRef: TabElementRefService, private renderer: Renderer2) {}

  ngOnInit() {}

  ngAfterViewInit() {
    this.colorFish();
    this.tabElementRef.tabRef = this.tabsContainer;
  }

  colorFish() {
    this.renderer.setStyle(this.active.nativeElement, "display", "none");
    this.renderer.setStyle(this.inactive.nativeElement, "display", "none");

    const selected = this.tabs.getSelected();

    if (selected === "home") {
      this.renderer.setStyle(this.active.nativeElement, "display", "block");
    } else {
      this.renderer.setStyle(this.inactive.nativeElement, "display", "block");
    }
  }
}
