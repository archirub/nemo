import {
  Component,
  ElementRef,
  OnInit,
  Renderer2,
  ViewChild,
  QueryList,
  ViewChildren,
} from "@angular/core";
import { IonTabs } from "@ionic/angular";

import { TabElementRefService } from "./tab-element-ref.service";

@Component({
  selector: "app-tab-menu",
  templateUrl: "./tab-menu.page.html",
  styleUrls: ["./tab-menu.page.scss"],
})
export class TabMenuPage {
  @ViewChild("tabs") tabs: IonTabs;
  @ViewChild("tabs", { read: ElementRef }) tabsContainer: ElementRef;
  @ViewChildren("active", { read: ElementRef }) actives: QueryList<ElementRef>;
  @ViewChildren("inactive", { read: ElementRef }) inactives: QueryList<ElementRef>;

  constructor(private tabElementRef: TabElementRefService, private renderer: Renderer2) {}

  ngAfterViewInit() {
    this.tabElementRef.tabsRef = this.tabsContainer;
    this.tabElementRef.tabs = this.tabs;
  }

  colorIcon(event) {
    //Hide all orange icons
    let targets = Array.from(this.actives);
    targets.forEach((el) => {
      this.renderer.setStyle(el.nativeElement, "display", "none");
    });

    //Show all grey icons
    let placeholders = Array.from(this.inactives);
    placeholders.forEach((el) => {
      this.renderer.setStyle(el.nativeElement, "display", "block");
    });

    //Map indexes of grey icons based on tab name
    let indexMap = {
      chats: 0,
      home: 1,
      "own-profile": 2,
    };

    let target = document.getElementsByName(event.tab)[0]; //Target and show orange icon
    this.renderer.setStyle(target, "display", "block");

    this.renderer.setStyle(
      placeholders[indexMap[event.tab]].nativeElement,
      "display",
      "none"
    ); //Hide the grey icon
  }
}
