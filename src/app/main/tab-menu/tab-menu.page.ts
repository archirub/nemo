import {
  Component,
  ElementRef,
  OnInit,
  Renderer2,
  ViewChild
} from "@angular/core";
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

  constructor(private tabElementRef: TabElementRefService, private renderer: Renderer2) {}

  ngOnInit() {}

  ngAfterViewInit() {
    this.tabElementRef.tabsRef = this.tabsContainer;
    this.tabElementRef.tabs = this.tabs;
  }

  async colorIcon() {
    var prev = document.getElementsByClassName('fillColor'); //Remove class from previous tab
    Array.from(prev).forEach(el => {
      el.classList.remove('fillColor');
    });

    var sel = await this.tabs.getSelected(); //Which tab has just been selected
    let target = document.getElementById(sel);

    target.classList.add('fillColor'); //Class is a filter that very closely approximates primary color
  }
}
