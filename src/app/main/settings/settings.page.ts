import {
  Component,
  AfterViewInit,
  ViewChild,
  ElementRef,
  Renderer2,
  OnDestroy,
  OnInit,
} from "@angular/core";
import { IonSlides, NavController } from "@ionic/angular";
import { AngularFireFunctions } from "@angular/fire/functions";

import {
  BehaviorSubject,
  concat,
  EMPTY,
  firstValueFrom,
  forkJoin,
  from,
  Observable,
  of,
  ReplaySubject,
  Subscription,
  throwError,
} from "rxjs";
import {
  distinctUntilChanged,
  exhaustMap,
  filter,
  map,
  switchMap,
  tap,
} from "rxjs/operators";

import { AppToggleComponent } from "@components/index";

import { CurrentUserStore } from "@stores/index";
import { FirebaseAuthService } from "@services/firebase-auth/firebase-auth.service";

import { AppUser } from "@classes/user.class";
import {
  Gender,
  SexualPreference,
  updateGenderSexPrefRequest,
  genderOptions,
  sexualPreferenceOptions,
  changeShowProfileRequest,
} from "@interfaces/index";
import { GlobalErrorHandler } from "@services/errors/global-error-handler.service";
import { LoadingAndAlertManager } from "@services/loader-and-alert-manager/loader-and-alert-manager.service";

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

  @ViewChild("goUnderToggle") goUnderToggle: AppToggleComponent;

  private goUnderRef$ = new ReplaySubject<ElementRef>(1);
  @ViewChild("goUnder") set goUnderRefSetter(ref: ElementRef) {
    if (ref) this.goUnderRef$.next(ref);
  }

  private slidesRef$ = new ReplaySubject<IonSlides>(1);
  @ViewChild("slides") set slidesRefSetter(ref: IonSlides) {
    if (ref) this.slidesRef$.next(ref);
  }

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
    map((showProfile) => formatShowProfileToGoUnder(showProfile)),
    switchMap((goUnder) => this.applyGoUnderStyling(goUnder)),
    tap((goUnder) => this.goUnderToggle.applyStyling(goUnder))
  );

  constructor(
    private renderer: Renderer2,
    private navCtrl: NavController,

    private afFunctions: AngularFireFunctions,

    private currentUserStore: CurrentUserStore,

    private loadingAlertManager: LoadingAndAlertManager,
    private errorHandler: GlobalErrorHandler,
    private firebaseAuth: FirebaseAuthService
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
    this.lockSwipes(true); //Stop swiping of slides so that users cannot see placeholder slide
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
    const loader = await this.loadingAlertManager.createLoading();
    await this.loadingAlertManager.presentNew(loader, "replace-erase");

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
      actionsToTake$.push(
        this.afFunctions
          .httpsCallable("updateGenderSexPref")(request)
          .pipe(
            this.errorHandler.convertErrors("cloud-functions"),
            this.errorHandler.handleErrors()
          )
      );
    }

    if (genderIsChanged) {
      const request: updateGenderSexPrefRequest = {
        name: "gender",
        value: this.gender,
      };
      actionsToTake$.push(
        this.afFunctions
          .httpsCallable("updateGenderSexPref")(request)
          .pipe(
            this.errorHandler.convertErrors("cloud-functions"),
            this.errorHandler.handleErrors()
          )
      );
    }

    await firstValueFrom(forkJoin(actionsToTake$));

    this.editingInProgress.next(false);

    await this.loadingAlertManager.dismissDisplayed();
  }

  // For responding to a change in the "goUnder" property. It sends it to the database and
  // updates the profile locally
  async actOnGoUnder(option: GoUnder) {
    const newShowProfile = formatGoUnderToShowProfile(option);

    const loader = await this.loadingAlertManager.createLoading();

    await firstValueFrom(
      this.currentUserStore.user$.pipe(
        map((u) => u?.settings?.showProfile),
        filter((currentShowProfile) => currentShowProfile !== newShowProfile),
        exhaustMap((user) => {
          const request: changeShowProfileRequest = {
            showProfile: newShowProfile,
          };

          return concat(
            this.loadingAlertManager.presentNew(loader, "replace-erase"),
            concat(
              this.afFunctions
                .httpsCallable("changeShowProfile")(request)
                .pipe(this.errorHandler.convertErrors("cloud-functions")),
              this.currentUserStore.updateShowProfileInStore(newShowProfile)
            ).pipe(this.errorHandler.handleErrors())
          );
        })
      )
    );

    await this.loadingAlertManager.dismissDisplayed();
  }

  async applyGoUnderStyling(goUnder: GoUnder) {
    const tabStyle = (await firstValueFrom(this.goUnderRef$)).nativeElement.style;

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
    await this.lockSwipes(false);

    if (direction === "next") {
      await this.slideNext();
    } else {
      await this.slidePrev();
    }

    await this.lockSwipes(true);
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

  async lockSwipes(bool: boolean) {
    return firstValueFrom(this.slidesRef$).then((ref) => ref.lockSwipes(bool));
  }

  async slidePrev() {
    return firstValueFrom(this.slidesRef$).then((ref) => ref.slidePrev());
  }
  async slideNext() {
    return firstValueFrom(this.slidesRef$).then((ref) => ref.slideNext());
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

function formatShowProfileToGoUnder(bool: boolean): GoUnder {
  if (bool === true) return "off";
  if (bool === false) return "on";
}

function formatGoUnderToShowProfile(str: GoUnder): boolean {
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
