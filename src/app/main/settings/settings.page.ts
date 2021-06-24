import { Component, AfterViewInit, ViewChild, ElementRef, NgZone } from "@angular/core";
import { IonSlides, NavController } from "@ionic/angular";
import { AngularFireAuth } from "@angular/fire/auth";

import { LoadingService, AngularAuthService } from "@services/index";
import { Router } from "@angular/router";
import { Subscription } from "rxjs";
import { CurrentUserStore } from "@stores/index";
import { FormControl, FormGroup, Validators } from "@angular/forms";

import { 
  Gender, 
  SexualPreference, 
  OnCampus, 
  searchCriteriaOptions,
  genderOptions,
  sexualPreferenceOptions,
  SwipeMode,
  swipeModeOptions
} from "@interfaces/index";

@Component({
  selector: "app-settings",
  templateUrl: "./settings.page.html",
  styleUrls: ["./settings.page.scss"],
})
export class SettingsPage implements AfterViewInit {
  @ViewChild("slide") slides: IonSlides;
  @ViewChild("goUnder") goUnder: ElementRef;

  currentUser;
  currentUser$: Subscription;

  // FORM
  form = new FormGroup({
    swipeMode: new FormControl(null),
    sexualPreference: new FormControl(null),
    gender: new FormControl(null),
    onCampus: new FormControl(null)
  });

  // OPTIONS
  swipeModeOptions: SwipeMode[] = swipeModeOptions;
  sexualPreferenceOptions: SexualPreference[] = sexualPreferenceOptions;
  genderOptions: Gender[] = genderOptions;
  onCampusOptions: OnCampus[] = searchCriteriaOptions.onCampus;

  constructor(
    private navCtrl: NavController,
    private afAuth: AngularFireAuth,
    private loadingService: LoadingService,
    private AngularAuthService: AngularAuthService,
    private currentUserStore: CurrentUserStore,
    private router: Router,
    private zone: NgZone
  ) {}

  ngAfterViewInit() {
    var legal = document.getElementById("legal"); //Do not display slides on start up, only when selected
    var prefs = document.getElementById("preferences");

    legal.style.display = "none";
    prefs.style.display = "none";

    this.slides.lockSwipes(true); //Stop swiping of slides so that users cannot see placeholder slide
  }

  ionViewDidEnter() {
    //Fetch current user profile to change preferences
    this.currentUser$ = this.currentUserStore.user$.subscribe(
      (profile) => {
        this.currentUser = profile;
      }
    );
  }

  goBack() {
    this.navCtrl.navigateBack("/main/tabs/own-profile");
  }

  async logOut() {
    // have to explicitely do it this way instead of using directly "this.navCtrl.navigateRoot"
    // otherwise it causes an error
    // calling ngZone.run() is necessary otherwise we will get into trouble with changeDecection
    // back at the welcome page (it seems like it's then not active), which cases problem for example
    // while trying to log back in where the "log in" button doesn't get enabled when the email-password form becomes valid
    const navigateToWelcome = (url: string) => {
      return this.zone.run(() => {
        this.navCtrl.setDirection("root");
        return this.router.navigateByUrl(url);
      });
    };

    await this.loadingService.presentLoader(
      [{ promise: this.afAuth.signOut, arguments: [] }],
      [{ promise: navigateToWelcome, arguments: ["/welcome"] }]
    );
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
