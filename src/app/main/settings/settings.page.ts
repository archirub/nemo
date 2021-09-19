import {
  Component,
  AfterViewInit,
  ViewChild,
  ElementRef,
  NgZone,
  ApplicationRef,
} from "@angular/core";
import { IonSlides, NavController } from "@ionic/angular";

import { Plugins } from "@capacitor/core";

import { FirebaseAuthService } from "@services/firebase-auth/firebase-auth.service";

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
  swipeModeOptions,
} from "@interfaces/index";
import { GlobalStateManagementService } from "@services/global-state-management/global-state-management.service";
import { Profile } from "@classes/profile.class";
import { AppUser } from "@classes/user.class";

@Component({
  selector: "app-settings",
  templateUrl: "./settings.page.html",
  styleUrls: ["./settings.page.scss"],
})
export class SettingsPage implements AfterViewInit {
  @ViewChild("slide") slides: IonSlides;
  @ViewChild("goUnder") goUnder: ElementRef;

  profileSub: Subscription;
  profile: AppUser;

  // FORM
  form = new FormGroup({
    swipeMode: new FormControl(null),
    sexualPreference: new FormControl(null),
    gender: new FormControl(null),
    onCampus: new FormControl(null),
  });

  // OPTIONS
  swipeModeOptions: SwipeMode[] = swipeModeOptions;
  sexualPreferenceOptions: SexualPreference[] = sexualPreferenceOptions;
  genderOptions: Gender[] = genderOptions;
  onCampusOptions: OnCampus[] = searchCriteriaOptions.onCampus;

  constructor(
    private navCtrl: NavController,
    private currentUserStore: CurrentUserStore,
    private router: Router,
    private zone: NgZone,
    private GlobalStateManagement: GlobalStateManagementService,
    private firebaseAuth: FirebaseAuthService
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
    this.profileSub = this.currentUserStore.user$.subscribe(
      (profile) => (this.profile = profile)
    );

    this.fillPreferences();
  }

  goBack() {
    this.navCtrl.navigateBack("/main/tabs/own-profile");
  }

  async logOut() {
    await this.firebaseAuth.logOut();
  }

  async deleteAccount() {
    console.log("asdas");
    await this.firebaseAuth.deleteAccount();
  }

  async changePassword() {
    console.log("Change paswsword function here");
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
    var support = document.getElementById("support");
    var placeholder = document.getElementById("placeholder");

    // Wait 0.2s to replace slides with placeholder so people don't see it disappear in the slide animation
    setTimeout(() => {
      placeholder.style.display = "block";
      legal.style.display = "none";
      prefs.style.display = "none";
      support.style.display = "none";
    }, 200);
  }

  selectSlide(slide) {
    /** For this function to work, the input 'slide' should be the same as the slide id
     * Hides placeholder slide and displays selected slide by id
     * Swipes to the targeted slide
     **/

    var placeholder = document.getElementById("placeholder");
    placeholder.style.display = "none";

    var target = document.getElementById(`${slide}`); //get slide by id from input
    target.style.display = "block";

    this.unlockAndSwipe("next"); //move to slide
  }

  /* Opens user's mail program with a new blank email to the address */
  openEmail() {
    window.open("mailto:customersupport@nemodating.com");
  }

  /* Finds preferences from profile and fills form with each control's value */
  fillPreferences() {
    //This is designed in such a way that in future we can add more controls in the same fashion
    let controls = [
      // { swipeMode: this.profile.swipeMode },
      { sexualPreference: this.profile?.sexualPreference },
      { gender: this.profile?.gender },
      { onCampus: this.profile?.onCampus },
    ];

    //Matches control name from objects above to profile's value and sets FormControl value
    controls.forEach((obj: Object) => {
      this.form.controls[Object.keys(obj)[0]].setValue(Object.values(obj)[0]);
    });
  }
}
