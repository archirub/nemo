import { Component, ElementRef, ViewChild } from "@angular/core";
import { IonTabs } from "@ionic/angular";
import { TutorialsService } from "@services/tutorials/tutorials.service";

import { TabElementRefService } from "./tab-element-ref.service";

@Component({
  selector: "app-tab-menu",
  templateUrl: "./tab-menu.page.html",
  styleUrls: ["./tab-menu.page.scss"],
})
export class TabMenuPage {
  @ViewChild("tabs") tabs: IonTabs;
  @ViewChild("tabs", { read: ElementRef }) tabsContainer: ElementRef;

  tutorialState: Record<string, boolean>
  hideTabs: boolean = false;

  constructor(
    private tabElementRef: TabElementRefService,
    private tutorials: TutorialsService
  ) {
    this.tutorials.checkTutorials().subscribe(res => { // Checks tutorials state so knows whether to hide tabs
      this.tutorialState = res;

      if (this.tabs) { // Without this if it will run a function on tabs onInit, which will be undefined
        this.colorIcon();
      };
    });
  }

  async ngAfterViewInit() {
    this.tabElementRef.tabsRef = this.tabsContainer;
    this.tabElementRef.tabs = this.tabs;
  }

  async checkHideTabs() {
    var sel = await this.tabs.getSelected(); //Which tab has just been selected

    this.hideTabs = this.tutorialState[sel];
  }

  async colorIcon() {
    this.checkHideTabs();

    var sel = await this.tabs.getSelected(); //Which tab has just been selected

    //NAUGHTY: SetTimeout lets hideTabs (and template) update before styling 
    setTimeout(() => {
      if (!this.hideTabs) {
        var prev = document.getElementsByClassName("fillColor"); //Remove class from previous tab
        Array.from(prev).forEach((el) => {
          el.classList.remove("fillColor");
        });
        
          let target = document.getElementById(sel);

          target.classList.add("fillColor"); //Class is a filter that very closely approximates primary color
      };
    }, 50);
  }
}
