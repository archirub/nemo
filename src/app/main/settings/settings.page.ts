import {
  Component,
  AfterViewInit,
  ViewChild,
  ElementRef,
  Renderer2,
  OnDestroy,
  OnInit,
} from "@angular/core";
import { IonSlides, LoadingController, NavController } from "@ionic/angular";
import { AngularFireFunctions } from "@angular/fire/functions";

import {
  BehaviorSubject,
  concat,
  firstValueFrom,
  forkJoin,
  from,
  Observable,
  Subscription,
} from "rxjs";
import { distinctUntilChanged, exhaustMap, filter, map, tap } from "rxjs/operators";

import { AppToggleComponent } from "@components/index";

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

type GoUnder = "on" | "off";

@Component({
  selector: "app-settings",
  templateUrl: "./settings.page.html",
  styleUrls: ["./settings.page.scss"],
})
export class SettingsPage implements AfterViewInit, OnDestroy, OnInit {
  sexualPreferenceOptions: SexualPreference[] = sexualPreferenceOptions;
  genderOptions: Gender[] = genderOptions;
  sexualPreference: "female" | "male" | "both";
  gender: Gender;

  profile: AppUser;

  subs = new Subscription();

  @ViewChild("slide") slides: IonSlides;
  @ViewChild("goUnder") goUnder: ElementRef;
  @ViewChild("goUnderToggle") goUnderToggle: AppToggleComponent;

  private editingInProgress = new BehaviorSubject<boolean>(false);

  editingInProgress$ = this.editingInProgress.asObservable().pipe(distinctUntilChanged());

  fillPageFromUserStoreHandler$ = this.currentUserStore.user$.pipe(
    tap((user) => (this.profile = user)),
    map((user) => this.fillPreferences(user))
  );

  goUnderStylingHandler$ = this.currentUserStore.user$.pipe(
    map((u) => u?.settings?.showProfile),
    filter((showProfile) => showProfile === true || showProfile === false),
    distinctUntilChanged(),
    map((showProfile) => showProfileToGoUnder(showProfile)),
    tap((goUnder) => this.applyGoUnderStyling(goUnder)),
    tap((goUnder) => this.goUnderToggle.applyStyling(goUnder))
  );

  constructor(
    private navCtrl: NavController,
    private currentUserStore: CurrentUserStore,
    private firebaseAuth: FirebaseAuthService,
    private afFunctions: AngularFireFunctions,
    private loadingCtrl: LoadingController,
    private loadingService: LoadingService,
    private renderer: Renderer2
  ) {}

  ngOnInit() {
    this.subs.add(this.fillPageFromUserStoreHandler$.subscribe());
  }

  ngAfterViewInit() {
    this.subs.add(this.goUnderStylingHandler$.subscribe());

    // what is all that for?
    const legal = document.getElementById("legal"); //Do not display slides on start up, only when selected
    const prefs = document.getElementById("preferences");
    this.renderer.setStyle(legal, "display", "none");
    this.renderer.setStyle(prefs, "display", "none");
    this.slides.lockSwipes(true); //Stop swiping of slides so that users cannot see placeholder slide
  }

  editingTriggered() {
    if (this.propertyChanged()) return this.editingInProgress.next(true);
    return this.editingInProgress.next(false);
  }

  async actOnEditing(action: "cancel" | "confirm") {
    if (action === "cancel") return this.onCancelPreferenceModification();
    if (action === "confirm") return this.onConfirmPreferenceModification();
  }

  private onCancelPreferenceModification() {
    this.sexualPreference = sexPrefArrayToString(this.profile?.sexualPreference);
    this.gender = this.profile?.gender;
    this.editingInProgress.next(false);
  }

  private async onConfirmPreferenceModification(): Promise<any> {
    const loader = await this.loadingCtrl.create(
      this.loadingService.defaultLoadingOptions
    );
    await loader.present();

    const actionsToTake$: Observable<any>[] = [];

    const genderIsChanged = this.genderChanged();
    const sexPrefIsChanged = this.sexualPreferenceChanged();

    actionsToTake$.push(
      from(
        this.currentUserStore.updateGenderSexPrefInStore(
          genderIsChanged ? this.gender : null,
          sexPrefIsChanged ? sexPrefStringToArray(this.sexualPreference) : null
        )
      )
    );

    if (sexPrefIsChanged) {
      const request: updateGenderSexPrefRequest = {
        name: "sexualPreference",
        value: sexPrefStringToArray(this.sexualPreference),
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

    await firstValueFrom(forkJoin(actionsToTake$));

    this.editingInProgress.next(false);

    await loader.dismiss();
  }

  // For responding to a change in the "goUnder" property. It sends it to the database and
  // updates the profile locally
  async actOnGoUnder(option: GoUnder) {
    const newShowProfile = goUnderToShowProfile(option);

    const loader = await this.loadingCtrl.create(
      this.loadingService.defaultLoadingOptions
    );

    await firstValueFrom(
      this.currentUserStore.user$.pipe(
        map((u) => u?.settings?.showProfile),
        filter((currentShowProfile) => currentShowProfile !== newShowProfile),
        exhaustMap((user) => {
          const request: changeShowProfileRequest = {
            showProfile: newShowProfile,
          };

          return concat(
            loader.present(),
            this.afFunctions.httpsCallable("changeShowProfile")(request),
            this.currentUserStore.updateShowProfileInStore(newShowProfile)
          );
        })
      )
    );

    await loader.dismiss();
  }

  applyGoUnderStyling(goUnder: GoUnder) {
    const tabStyle = this.goUnder.nativeElement.style;

    if (goUnder === "on") {
      tabStyle.color = "var(--ion-color-primary)";
      tabStyle.fontWeight = "bold";
    } else if (goUnder === "off") {
      tabStyle.color = "var(--ion-color-light-contrast)";
      tabStyle.fontWeight = "normal";
    }
  }

  /* Finds preferences from profile and fills form with each control's value */
  fillPreferences(user: AppUser) {
    if (user?.gender) this.gender = user?.gender;

    if (user?.sexualPreference)
      this.sexualPreference = sexPrefArrayToString(user?.sexualPreference);
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
    const legal = document.getElementById("legal");
    const prefs = document.getElementById("preferences");
    const support = document.getElementById("support");
    const placeholder = document.getElementById("placeholder");

    // Wait 0.2s to replace slides with placeholder so people don't see it disappear in the slide animation
    setTimeout(() => {
      this.renderer.setStyle(placeholder, "display", "block");
      this.renderer.setStyle(legal, "display", "none");
      this.renderer.setStyle(prefs, "display", "none");
      this.renderer.setStyle(support, "display", "none");
    }, 200);
  }

  selectSlide(slide) {
    /** For this function to work, the input 'slide' should be the same as the slide id
     * Hides placeholder slide and displays selected slide by id
     * Swipes to the targeted slide
     **/

    const placeholder = document.getElementById("placeholder");
    this.renderer.setStyle(placeholder, "display", "none");

    const target = document.getElementById(`${slide}`); //get slide by id from input
    this.renderer.setStyle(target, "display", "block");

    this.unlockAndSwipe("next"); //move to slide
  }

  async goBack() {
    return this.navCtrl.navigateBack("/main/tabs/own-profile");
  }

  async logOut() {
    return this.firebaseAuth.logOut();
  }

  async deleteAccount() {
    return this.firebaseAuth.deleteAccount();
  }

  async changePassword() {
    await this.firebaseAuth.changePasswordProcedure();
  }

  propertyChanged(): boolean {
    return this.genderChanged() || this.sexualPreferenceChanged();
  }

  genderChanged(): boolean {
    return this.profile?.gender !== this.gender;
  }

  sexualPreferenceChanged(): boolean {
    return sexPrefArrayToString(this.profile?.sexualPreference) !== this.sexualPreference;
  }

  /* Opens user's mail program with a new blank email to the address */
  openEmail() {
    window.open("mailto:customersupport@nemodating.com");
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }
}

function showProfileToGoUnder(bool: boolean): GoUnder {
  if (bool === true) return "off";
  if (bool === false) return "on";
}

function goUnderToShowProfile(str: GoUnder): boolean {
  return str === "off";
}

function sexPrefArrayToString(array: SexualPreference): "male" | "female" | "both" {
  if (JSON.stringify(["male", "female"].sort()) === JSON.stringify(array?.sort()))
    return "both";
  if (JSON.stringify(["male"]) === JSON.stringify(array)) return "male";
  if (JSON.stringify(["female"]) === JSON.stringify(array)) return "female";
}

function sexPrefStringToArray(string: "male" | "female" | "both"): SexualPreference {
  if (string === "male") return ["male"];
  if (string === "female") return ["female"];
  if (string === "both") return ["male", "female"];
}
