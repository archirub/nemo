import { Component, AfterViewInit, ViewChild, ElementRef } from '@angular/core';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
})
export class SettingsPage implements AfterViewInit {
  @ViewChild("goUnder") goUnder: ElementRef;
  @ViewChild("goUnderH3") goUnderH3: ElementRef;

  constructor() { }

  ngAfterViewInit() {
  }

  goneUnder() {
    // Fetch gone under tab
    var tab = this.goUnder.nativeElement
    var subhead = this.goUnderH3.nativeElement
    if (tab.style.backgroundColor == "var(--ion-color-light-tint)") {
      // Restyling when gone under selected
      tab.style.backgroundColor = "var(--ion-color-secondary-shade)";
      tab.style.color = "var(--ion-color-primary-contrast)";
      subhead.style.color = "var(--ion-color-primary-contrast)";
    } else {
      // Style back to normal when deselected
      tab.style.backgroundColor = "var(--ion-color-light-tint)";
      tab.style.color = "var(--ion-color-light-contrast)";
      subhead.style.color = "var(--ion-color-medium-tint)";
    }
  }
}
