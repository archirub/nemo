import {
  Component,
  ElementRef,
  EventEmitter,
  OnDestroy,
  Renderer2,
  ViewChild,
} from "@angular/core";
import { IonTabs } from "@ionic/angular";

import { combineLatest, filter, map, startWith, Subscription } from "rxjs";

import { TutorialsService } from "@services/tutorials/tutorials.service";
import { TabElementRefService } from "./tab-element-ref.service";

@Component({
  selector: "app-tab-menu",
  templateUrl: "./tab-menu.page.html",
  styleUrls: ["./tab-menu.page.scss"],
})
export class TabMenuPage implements OnDestroy {
  @ViewChild("tabs") tabs: IonTabs;
  @ViewChild("tabs", { read: ElementRef }) tabsContainer: ElementRef;

  private subs = new Subscription();

  // template emits to this when tabs change
  tabChanged$ = new EventEmitter<any>();

  // subscribed in template to show/hide tabs
  showTab$ = combineLatest([this.tabChanged$, this.tutorials.hasSeenTutorial$]).pipe(
    filter(([_, hst]) => !!this.tabs && !!hst),
    map(([_, hst]) => [this.tabs.getSelected(), hst] as const),
    map(([tabName, hst]) => {
      if (tabName == "own-profile") return hst.ownProfile;
      if (tabName == "home") return hst.home;
      if (tabName == "chats") return hst.chatBoard;
      return true;
    }),
    startWith(true)
  );

  manageIconColoring$ = this.tabChanged$.pipe(
    filter(() => !!this.tabs),
    map(() => this.tabs.getSelected()),
    map((tabName) => {
      const prev = document.getElementsByClassName("fillColor"); //Remove class from previous tab
      Array.from(prev).forEach((el) => this.renderer.removeClass(el, "fillColor"));

      const target = document.getElementById(tabName);
      this.renderer.addClass(target, "fillColor"); //Class is a filter that very closely approximates primary color
    })
  );

  constructor(
    private renderer: Renderer2,
    private tutorials: TutorialsService,
    private tabElementRef: TabElementRefService
  ) {
    this.subs.add(this.manageIconColoring$.subscribe());
  }

  ngAfterViewInit() {
    this.tabElementRef.tabsRef = this.tabsContainer;
    this.tabElementRef.tabs = this.tabs;
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }
}
