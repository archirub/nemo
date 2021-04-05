import { Component, AfterViewInit, ViewChild, ElementRef } from "@angular/core";
import { IonSlides, NavController } from "@ionic/angular";
import { AngularFireAuth } from "@angular/fire/auth";

import { LoadingService, AngularAuthService } from "@services/index";

@Component({
  selector: "app-settings",
  templateUrl: "./settings.page.html",
  styleUrls: ["./settings.page.scss"],
})
export class SettingsPage implements AfterViewInit {
  @ViewChild("slide") slides: IonSlides;
  @ViewChild("goUnder") goUnder: ElementRef;

  constructor(
    private navCtrl: NavController,
    private afAuth: AngularFireAuth,
    private loadingService: LoadingService,
    private AngularAuthService: AngularAuthService
  ) {}

  ngAfterViewInit() {
    var legal = document.getElementById("legal"); //Do not display slides on start up, only when selected
    var prefs = document.getElementById("preferences");

    legal.style.display = "none";
    prefs.style.display = "none";

    this.slides.lockSwipes(true); //Stop swiping of slides so that users cannot see placeholder slide
  }

  goBack() {
    this.navCtrl.navigateBack("/main/tabs/own-profile");
  }

  async logOut() {
    await this.loadingService.presentLoader(
      [{ promise: this.AngularAuthService.logout, arguments: [] }]
      // [{ promise: this.navCtrl.navigateRoot.bind(this), arguments: [["/welcome"]] }]
    );
    await this.navCtrl.navigateRoot("/welcome");
  }

  /* Styles gone 'under' tab on toggle */
  goneUnder(option) {
    // Fetch gone under tab
    var tab = this.goUnder.nativeElement;

    if (option === "on") {
      tab.style.color = "var(--ion-color-primary)";
      tab.style.fontWeight = "bold";
      // console.log("User has gone under.");
    } else if (option === "off") {
      tab.style.color = "var(--ion-color-light-contrast)";
      tab.style.fontWeight = "normal";
    }
  }

  /* Unlocks swipes, slides to next/prev and then locks swipes */
  unlockAndSwipe(direction) {
    this.slides.lockSwipes(false);

    if (direction == "next") {
      this.slides.slideNext();
    } else {
      this.slides.slidePrev();
    }

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
    }
  }
}
