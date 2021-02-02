import { Component, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { IonSlides } from '@ionic/angular';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
})
export class SettingsPage implements AfterViewInit {
  @ViewChild("slide") slides: IonSlides;
  @ViewChild("goUnder") goUnder: ElementRef;
  @ViewChild("goUnderH3") goUnderH3: ElementRef;

  constructor() { 
  }

  ngAfterViewInit() {
    var legal = document.getElementById("legal"); //Do not display slides on start up, only when selected
    var prefs = document.getElementById("preferences");
  
    legal.style.display = "none";
    prefs.style.display = "none";

    this.slides.lockSwipes(true); //Stop swiping of slides so that users cannot see placeholder slide
  }

  /* Styles gone 'under' tab on toggle */
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

  /* Unlocks swipes, slides to next/prev and then locks swipes */
  unlockAndSwipe(direction) {
    this.slides.lockSwipes(false);

    if (direction == "next") {
      this.slides.slideNext();
    } else {
      this.slides.slidePrev();
    };

    this.slides.lockSwipes(true);
  }

  /* Returns to first settings page, displays placeholder again */
  returnToSettings() {
    this.unlockAndSwipe("prev");
    var legal = document.getElementById("legal");
    var prefs = document.getElementById("preferences");
    var placeholder = document.getElementById("placeholder");

    // Wait 0.2s to replace slides with placeholder so people don't see it disappear in the slide animation
    setTimeout(() => { 
      placeholder.style.display = "block";
      legal.style.display = "none";
      prefs.style.display = "none";
    }, 200);
  }

  /* Replaces placeholder slide with selected slide and swipes to */
  selectSlide(slide) {
    var legal = document.getElementById("legal");
    var prefs = document.getElementById("preferences");
    var placeholder = document.getElementById("placeholder");
    placeholder.style.display = "none";

    if (slide == "legal") {
      legal.style.display = "block";
      this.unlockAndSwipe("next");

    } else if (slide == "prefs") {
      prefs.style.display = "block";
      this.unlockAndSwipe("next");
      
    } else {
      console.log("Missing slides?");
    };
  }
}
