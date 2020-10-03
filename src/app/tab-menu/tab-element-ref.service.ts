import { Injectable, ElementRef } from "@angular/core";

@Injectable({
  providedIn: "root",
})
export class TabElementRefService {
  tabRef: ElementRef;

  constructor() {}
}
