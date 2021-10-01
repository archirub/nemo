import { Injectable, ElementRef } from "@angular/core";
import { IonTabs } from "@ionic/angular";

@Injectable({
  providedIn: "root",
})
export class TabElementRefService {
  tabsRef: ElementRef;
  tabs: IonTabs;

  constructor() {}
}
