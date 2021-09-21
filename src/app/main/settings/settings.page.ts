import { AppToggleComponent } from "@components/index";
import { Component, AfterViewInit, ViewChild, ElementRef, NgZone } from "@angular/core";
import { IonSlides, LoadingController, NavController } from "@ionic/angular";

import { AngularFireFunctions } from "@angular/fire/compat/functions";

import {
  BehaviorSubject,
  concat,
  forkJoin,
  from,
  Observable,
  of,
  Subscription,
} from "rxjs";
import { distinctUntilChanged, exhaustMap, map, take, tap } from "rxjs/operators";

import { CurrentUserStore } from "@stores/index";
import { FirebaseAuthService } from "@services/firebase-auth/firebase-auth.service";
import { LoadingService } from "@services/loading/loading.service";
import { AppUser } from "@classes/user.class";
import {
  Gender,
  SexualPreference,
  updateGenderSexPrefRequest,
  genderOptions,
  sexualPreferenceOptions,
  changeShowProfileRequest,
} from "@interfaces/index";

@Component({
  selector: "app-settings",
  templateUrl: "./settings.page.html",
  styleUrls: ["./settings.page.scss"],
})
export class SettingsPage implements AfterViewInit {
  @ViewChild("slide") slides: IonSlides;
  @ViewChild("goUnder") goUnder: ElementRef;
  @ViewChild("goUnderToggle") goUnderToggle: AppToggleComponent;

  private editingInProgress = new BehaviorSubject<boolean>(false);
  editingInProgress$ = this.editingInProgress.asObservable().pipe(distinctUntilChanged());

  profileSub: Subscription;
  profile: AppUser;

  sexualPreference: "female" | "male" | "both";
  gender: Gender;
  // swipeMode: SwipeMode
  // onCampus: onCampus
  showProfile: "on" | "off";

  // OPTIONS
  // swipeModeOptions: SwipeMode[] = swipeModeOptions;
  sexualPreferenceOptions: SexualPreference[] = sexualPreferenceOptions;
  genderOptions: Gender[] = genderOptions;
  // onCampusOptions: OnCampus[] = searchCriteriaOptions.onCampus;

  constructor(
    private navCtrl: NavController,
    private currentUserStore: CurrentUserStore,

    private firebaseAuth: FirebaseAuthService,
    private afFunctions: AngularFireFunctions,
    private loadingCtrl: LoadingController,
    private loadingService: LoadingService
  ) {}

  ngAfterViewInit() {
    this.editingInProgress$.subscribe((v) => console.log("editiing in progress", v));
    var legal = document.getElementById("legal"); //Do not display slides on start up, only when selected
    var prefs = document.getElementById("preferences");

    legal.style.display = "none";
    prefs.style.display = "none";

    this.slides.lockSwipes(true); //Stop swiping of slides so that users cannot see placeholder slide
  }

  ionViewDidEnter() {
    //Fetch current user profile to change preferences
    this.profileSub = this.currentUserStore.user$
      .pipe(
        tap((user) => (this.profile = user)),
        map((user) => this.fillPreferences(user))
      )
      .subscribe();
  }

  async goBack() {
    return this.navCtrl.navigateBack("/main/tabs/own-profile");
  }

  async logOut() {
    await this.firebaseAuth.logOut();
  }

  async deleteAccount() {
    await this.firebaseAuth.deleteAccount();
  }

  async changePassword() {
    await this.firebaseAuth.changePasswordProcedure();
  }

  /* Styles gone 'under' tab on toggle */
  async actOnGoUnder(option: "on" | "off") {
    this.applyGoUnderStyling(option);

    const loader = await this.loadingCtrl.create(
      this.loadingService.defaultLoadingOptions
    );

    await this.currentUserStore.user$
      .pipe(
        take(1),
        exhaustMap((user) => {
          if (
            this.showProfile == null ||
            user?.settings?.showProfile === (this.showProfile === "on")
          )
            return of("");
          const request: changeShowProfileRequest = {
            showProfile: this.showProfile === "on",
          };

          return concat(
            loader.present(),
            this.afFunctions.httpsCallable("changeShowProfile")(request),
            this.currentUserStore.updateShowProfileInStore(this.showProfile === "on")
          ).pipe(tap((a) => console.log("this is ", a)));
        })
      )
      .toPromise();

    await loader.dismiss();
  }

  applyGoUnderStyling(showProfile: "on" | "off") {
    const tabStyle = this.goUnder.nativeElement.style;

    if (showProfile === "on") {
      tabStyle.color = "var(--ion-color-primary)";
      tabStyle.fontWeight = "bold";
    } else if (showProfile === "off") {
      tabStyle.color = "var(--ion-color-light-contrast)";
      tabStyle.fontWeight = "normal";
    }
  }

  /* Unlocks swipes, slides to next/prev and then locks swipes */
  async unlockAndSwipe(direction) {
    await this.slides.lockSwipes(false);

    if (direction === "next") {
      await this.slides.slideNext();
    } else {
      await this.slides.slidePrev();
    }

    await this.slides.lockSwipes(true);
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
  fillPreferences(user: AppUser) {
    if (user?.gender) this.gender = user?.gender;

    if (user?.sexualPreference)
      this.sexualPreference = this.sexPrefArrayToString(user?.sexualPreference);

    if (user?.settings?.showProfile) {
      this.goUnderToggle.selectOption(user?.settings?.showProfile ? "on" : "off");
      this.applyGoUnderStyling(this.showProfile);
    }

    console.log(
      "preferences template",
      this.sexualPreference,
      this.gender,
      this.showProfile
    );
  }

  editingTriggered() {
    if (this.aPropertyIsChanged()) return this.editingInProgress.next(true);
    return this.editingInProgress.next(false);
  }

  async actOnEditing(action: "cancel" | "confirm") {
    if (action === "cancel") return this.onCancelPreferenceModification();
    if (action === "confirm") return this.onConfirmPreferenceModification();
  }

  private onCancelPreferenceModification() {
    this.sexualPreference = this.sexPrefArrayToString(this.profile?.sexualPreference);
    this.gender = this.profile?.gender;
    this.editingInProgress.next(false);
  }

  private async onConfirmPreferenceModification(): Promise<any> {
    const loader = await this.loadingCtrl.create(
      this.loadingService.defaultLoadingOptions
    );
    await loader.present();

    const actionsToTake$: Observable<any>[] = [];

    const genderIsChanged = this.genderIsChanged();
    const sexPrefIsChanged = this.sexualPreferenceIsChanged();

    actionsToTake$.push(
      from(
        this.currentUserStore.updateGenderSexPrefInStore(
          genderIsChanged ? this.gender : null,
          sexPrefIsChanged ? this.sexPrefStringToArray(this.sexualPreference) : null
        )
      )
    );

    if (sexPrefIsChanged) {
      console.log("easy ");
      const request: updateGenderSexPrefRequest = {
        name: "sexualPreference",
        value: this.sexPrefStringToArray(this.sexualPreference),
      };
      actionsToTake$.push(this.afFunctions.httpsCallable("updateGenderSexPref")(request));
    }

    if (genderIsChanged) {
      const request: updateGenderSexPrefRequest = {
        name: "gender",
        value: this.gender,
      };
      actionsToTake$.push(this.afFunctions.httpsCallable("updateGenderSexPref")(request));
    }

    await forkJoin(actionsToTake$).toPromise();

    this.editingInProgress.next(false);

    await loader.dismiss();
  }

  genderIsChanged(): boolean {
    return this.profile?.gender !== this.gender;
  }

  sexualPreferenceIsChanged(): boolean {
    return (
      this.sexPrefArrayToString(this.profile?.sexualPreference) !== this.sexualPreference
    );
  }

  aPropertyIsChanged(): boolean {
    return this.genderIsChanged() || this.sexualPreferenceIsChanged();
  }

  sexPrefArrayToString(array: SexualPreference): "male" | "female" | "both" {
    if (JSON.stringify(["male", "female"].sort()) === JSON.stringify(array?.sort()))
      return "both";
    if (JSON.stringify(["male"]) === JSON.stringify(array)) return "male";
    if (JSON.stringify(["female"]) === JSON.stringify(array)) return "female";
  }

  sexPrefStringToArray(string: "male" | "female" | "both"): SexualPreference {
    if (string === "male") return ["male"];
    if (string === "female") return ["female"];
    if (string === "both") return ["male", "female"];
  }
}
