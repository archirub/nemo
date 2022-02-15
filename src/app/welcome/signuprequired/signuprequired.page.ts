import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  ViewChild,
  ViewChildren,
  QueryList,
  OnInit,
  Renderer2,
  OnDestroy,
} from "@angular/core";
import { IonCheckbox, IonSlides, ModalController, NavController } from "@ionic/angular";
import { FormGroup, FormControl, Validators } from "@angular/forms";
import { Router } from "@angular/router";

import { firstValueFrom, ReplaySubject, Subscription } from "rxjs";
import { concatMap, delay, map } from "rxjs/operators";

import { AppDatetimeComponent } from "@components/index";

import { UniversitiesStore } from "@stores/universities/universities.service";
import { SignupService } from "@services/signup/signup.service";

import {
  Degree,
  Gender,
  SexualPreference,
  UniversityName,
  searchCriteriaOptions,
  sexualPreferenceOptions,
  genderOptions,
  MAX_PROFILE_PICTURES_COUNT,
} from "@interfaces/index";
import { SignupRequired } from "@interfaces/signup.model";
import { allowOptionalProp } from "@interfaces/index";
import { GlobalErrorHandler } from "@services/errors/global-error-handler.service";
import { LoadingAndAlertManager } from "@services/loader-and-alert-manager/loader-and-alert-manager.service";
import { AnalyticsService } from "@services/analytics/analytics.service";
import { PrivacyModalComponent } from "./privacy-modal/privacy-modal.component";
import { SCenterAnimation } from "@animations/index";
import { SCleaveAnimation } from "@animations/index";
import { TermsModalComponent } from "./terms-modal/terms-modal.component";
import { ManagementPauser } from "@services/global-state-management/management-pauser.service";

@Component({
  selector: "app-signuprequired",
  templateUrl: "./signuprequired.page.html",
  styleUrls: ["../welcome.page.scss"],
})
export class SignuprequiredPage implements OnInit, OnDestroy {
  genderOptions: Gender[] = genderOptions;
  sexualPreferenceOptions: SexualPreference[] = sexualPreferenceOptions;
  degreeOptions: Degree[] = searchCriteriaOptions.degree;
  slidesLeft: number;
  age: number = 0;
  minDOB: Date;
  universitySelectionDisabled: boolean = false;
  slideIndexes: { [k in keyof SignupRequired]: number } = {
    firstName: 0,
    dateOfBirth: 1,
    pictures: 2,
    sexualPreference: 3,
    gender: 3,
    university: 4,
    degree: 4,
  };

  private subs = new Subscription();

  form = this.blankForm;
  picturesHolder: string[] = Array.from({ length: MAX_PROFILE_PICTURES_COUNT }); // for storing pictures. Separate from rest of form, added to it on form submission
  reqValidatorChecks: object; // ui map to check validators, built in ionViewDidEnter() hook and for usage in validateAndSlide()

  @ViewChild("slides") slides: IonSlides;
  @ViewChild("slides", { read: ElementRef }) slidesRef: ElementRef;
  @ViewChild("date") date: AppDatetimeComponent;
  @ViewChildren("pagerDots", { read: ElementRef }) dots: QueryList<ElementRef>;
  @ViewChild("tcbox") tcbox: IonCheckbox;
  @ViewChild("ppbox") ppbox: IonCheckbox;

  private videoPlayerRef$ = new ReplaySubject<ElementRef>(1);
  @ViewChild("videoPlayer", { read: ElementRef }) set videoPlayerSetter(ref: ElementRef) {
    if (ref) {
      this.videoPlayerRef$.next(ref);
    }
  }

  universityOptions$ = this.universitiesStore.optionsList$;

  universitySelectingHandler$ = this.errorHandler.getCurrentUser$().pipe(
    concatMap((user) => this.universitiesStore.getUniversityFromEmail(user.email)),
    delay(5000), // required otherwise it gets set too early and gets set back to null
    map((universityName) => {
      const uniFormControl = this.form.get("university");

      if (universityName) {
        uniFormControl.setValue(universityName);
        // this.universitySelect.value = universityName;
        this.universitySelectionDisabled = true;
        // this.changeDetectorRef.detectChanges();
      } else {
        this.universitySelectionDisabled = false;
      }
    })
  );

  get blankForm() {
    return new FormGroup({
      firstName: new FormControl(null, [Validators.required, Validators.minLength(1)]),
      dateOfBirth: new FormControl(null),
      sexualPreference: new FormControl(null, [Validators.required]),
      gender: new FormControl(null, [Validators.required]),
      university: new FormControl(null, [Validators.required]),
      degree: new FormControl(null, [Validators.required]),
    });
  }

  constructor(
    private router: Router,
    private changeDetectorRef: ChangeDetectorRef,
    private renderer: Renderer2,
    private navCtrl: NavController,

    private fbAnalytics: AnalyticsService,

    private universitiesStore: UniversitiesStore,

    private managementPauser: ManagementPauser,
    private loadingAlertManager: LoadingAndAlertManager,
    private errorHandler: GlobalErrorHandler,
    private signup: SignupService,

    private modalCtrl: ModalController
  ) {}

  ngOnInit() {
    this.subs.add(this.universitySelectingHandler$.subscribe());

    this.playVideo();
  }

  ionViewWillEnter() {
    this.playVideo();
    this.reqValidatorChecks = this.getReqValidatorChecks();
  }

  ionViewDidEnter() {
    this.signup
      .getLocalStorage()
      .then(() => this.fillFieldsAndGoToSlide())
      .then(() => this.updatePager());
  }

  /**
   * Checks whether all the data is valid, if it isn't redirect to slide of unvalid data,
   * if it is, then save the data and direct to signupoptional
   */
  async onSubmit() {
    const invalidSlide = this.getfirstInvalidSlideIndex();

    // if invalidSlide is non-null, then there is a slide with invalid data
    // cannot just use if (invalidSlide) {} syntax as number 0 is falsy
    if (typeof invalidSlide === "number") return this.unlockAndSlideTo(invalidSlide);

    await this.updateData(); // may not be necessary, but last check to make sure data we have in logic exactly reflects that in the UI

    //Req must be complete by this point, log analytics
    await firstValueFrom(
      this.errorHandler
        .getCurrentUser$()
        .pipe(map((user) => this.fbAnalytics.logEvent("signupreq_complete", user)))
    );

    return this.router.navigateByUrl("/welcome/signupoptional");
  }

  /**
   * Checks whether the field on the current slide has valid value, allows continuing if true, input
   * entry (string): the field of the form to check validator for, e.g. email, password
   * If on the final validator, password, submits form instead of sliding to next slide
   * THIS SHOULD BE USED ON THE NEXT SLIDE BUTTONS
   **/
  validateAndSlide(entry: string | string[]) {
    let falseCount = 0; // Count how many are invalid

    const policyCheckMsg = document.getElementById("policiesCheck");

    Object.values(this.reqValidatorChecks).forEach((element) =>
      this.renderer.setStyle(element, "display", "none")
    ); // Clear any UI already up
    this.renderer.setStyle(policyCheckMsg, "display", "none");

    if (typeof entry === "object") {
      //Check for policy boxes, these are not checked against form
      if (entry.includes("policies")) {
        const checks = [this.tcbox.checked, this.ppbox.checked];

        if (checks.includes(false)) {
          this.renderer.setStyle(policyCheckMsg, "display", "flex");
          falseCount++;
        }
      }

      entry.forEach((element) => {
        // IMPORTANT that this is !invalid instead of valid
        // This is because setting a FormControl to disabled makes valid = false but
        // invalid = true (see https://github.com/angular/angular/issues/18678)
        if (element === "policies") return;
        const validity = !this.form.get(element).invalid;

        if (validity === false) {
          // If invalid, increase falseCount and display "invalid" UI
          falseCount++;
          this.renderer.setStyle(this.reqValidatorChecks[element], "display", "flex");
        }
      });

      if (falseCount === 0) {
        // All valid, not last entry so slide next
        Object.values(this.reqValidatorChecks).forEach((element) =>
          this.renderer.setStyle(element, "display", "none")
        ); // Hide all "invalid" UI
        this.unlockAndSlideToNext();
      }
    } else {
      // IMPORTANT that this is !invalid instead of valid
      const validity = !this.form.get(entry).invalid;

      if (entry === "dateOfBirth" && this.age < 18) {
        this.renderer.setStyle(this.reqValidatorChecks["dateOfBirth"], "display", "flex");
        return;
      }

      if (validity === true) {
        Object.values(this.reqValidatorChecks).forEach((element) =>
          this.renderer.setStyle(element, "display", "none")
        ); // Hide all "invalid" UI

        this.unlockAndSlideToNext(); // If others valid, slide next
      } else {
        this.renderer.setStyle(this.reqValidatorChecks[entry], "display", "flex"); // Show "invalid" UI for invalid validator
      }
    }
  }

  // copy paste from signup optional's onSubmit() method
  async skipToApp() {
    const loader = await this.loadingAlertManager.createLoading({
      message: "Setting up your account...",
    });
    await this.loadingAlertManager.presentNew(loader, "replace-erase");

    const slideCount = await this.slides.length();
    const invalidSlide = this.getfirstInvalidSlideIndex();
    // go to slide if invalidSlide is non null and that it isn't the last slide
    if (invalidSlide && invalidSlide + 1 !== slideCount) {
      const alert = await this.loadingAlertManager.createAlert({
        backdropDismiss: false,
        header: "We found some invalid data...",
        buttons: ["Go to field"],
      });

      alert.onDidDismiss().then(() => this.unlockAndSlideTo(invalidSlide));

      return this.loadingAlertManager.presentNew(alert, "replace-erase");
    }

    await this.managementPauser.requestPause("skip-to-app");

    await this.updateData();

    try {
      await this.signup.createFirestoreAccount();
    } catch (e) {
      await this.managementPauser.unrequestPause("skip-to-app");

      await this.loadingAlertManager.dismissDisplayed();

      await this.onAccountCreationFailure();
    }

    await this.signup.initializeUser();

    await this.loadingAlertManager.dismissDisplayed();

    await this.managementPauser.unrequestPause("skip-to-app");

    //Log analytics event for skip to app
    // no need to await since logic is not dependent on its success
    this.fbAnalytics.logEvent("skip_to_app", await this.errorHandler.getCurrentUser());

    return this.navigateToSignupToApp();
  }

  async navigateToSignupToApp() {
    await this.pauseVideo();
    return this.navCtrl.navigateForward("/welcome/signup-to-app");
  }

  /**
   * Gets the current data stored in the signupData observable from the service.
   * Checks whether the fields in that component (the "required" ones) have a value.
   * Fills that info and moves to earliest slide that doesn't have any information
   *
   * CAREFUL: this function is very case specific, not general. careful when: redefining the
   * name of fields, changing the order of the elements in the slides
   */
  async fillFieldsAndGoToSlide() {
    const formFields = Object.keys(this.slideIndexes);
    const currentSignupData = await firstValueFrom(this.signup.signupData$); // only getting a snapshot instead of subscribing as we only want to use this function once at the start, not change swipe whenever

    // creating object with ONLY required fields and their values from signupData observable
    const requiredData = {};
    Object.keys(currentSignupData).forEach((field) => {
      if (formFields.includes(field)) {
        requiredData[field] = currentSignupData[field];
      }
    });

    // filling fields
    this.fillFields(requiredData);

    // updating date component value
    await this.date.getWrittenValue().then(() => this.date.getDate());

    // moving to slide of index with earliest incomplete fields
    // if there is none, then moving to last slide
    await this.unlockAndSlideTo(
      this.getfirstInvalidSlideIndex() ?? (await this.slides.length())
    );
  }

  /**
   * From the data provided, fills the fields in the template
   * @param data
   */
  fillFields(data: allowOptionalProp<SignupRequired>): void {
    Object.keys(data).forEach((field) => {
      if (field === "pictures") {
        if (data[field]) {
          data[field].forEach((pic, i) => {
            this.savePhoto({ photoUrl: pic, index: i });
          });
        }
      } else if (field === "dateOfBirth") {
        this.date.writeValue(data[field] as unknown as string);
      } else {
        if (field === "sexualPreference") {
        }
        const formControl = this.form.get(field);
        if (formControl) formControl.setValue(data[field]);
      }
    });
  }

  // USE THIS TO UPDATE THE DATA OBSERVABLE AT EACH SWIPE AS WELL AS TO STORE IT LOCALLY
  updateData(): Promise<void> {
    const validData = {};

    // MIGHT HAVE TO PASS THE PICTURES AS BASE64STRINGS HERE IF YOU WANT TO STORE THEM
    return this.signup.addToDataHolders(this.formValues);
  }

  get formValues(): SignupRequired {
    const firstName: string = this.form.get("firstName").value;

    let dateOfBirth: Date = new Date(this.form.get("dateOfBirth").value);

    const formatedSexualPreference: "male" | "female" | "both" =
      this.form.get("sexualPreference").value;
    let sexualPreference: SexualPreference;
    if (Array.isArray(formatedSexualPreference)) {
      sexualPreference = formatedSexualPreference;
    } else if (formatedSexualPreference === "both") {
      sexualPreference = ["male", "female"];
    } else {
      sexualPreference = [formatedSexualPreference];
    }

    const gender: Gender = this.form.get("gender").value;

    const university: UniversityName = this.form.get("university").value;

    const degree: Degree = this.form.get("degree").value;

    const pictures: string[] = this.picturesHolder.filter(Boolean);

    return {
      firstName,
      dateOfBirth,
      sexualPreference,
      gender,
      university,
      degree,
      pictures,
    };
  }

  savePhoto(e: { photoUrl: string; index: number }) {
    this.picturesHolder[e.index] = e.photoUrl;
    this.changeDetectorRef.detectChanges(); // forces Angular to check updates in the template
  }

  async updatePager() {
    /*
     * Function to get the current slider and update the pager icons accordingly, no inputs
     * Should be called on launch and after a slide is changed each time
     */

    //Retrieve all icons as element variables
    const person = document.getElementById("person");
    const gift = document.getElementById("gift");
    const camera = document.getElementById("camera");
    const happy = document.getElementById("happy");
    const school = document.getElementById("school");

    //Hash maps are quickest and most efficient; keys are slide numbers, values are icon to show
    const map = {
      0: person,
      1: gift,
      2: camera,
      3: happy,
      4: school,
    };

    //Initially display none
    Object.values(map).forEach((element) =>
      this.renderer.setStyle(element, "display", "none")
    );

    //Don't display dots for slides left either
    const dots = Array.from(this.dots);
    Array.from(dots).forEach((element) =>
      this.renderer.setStyle(element.nativeElement, "display", "none")
    );

    //Get current slide index and calculate slides left after this one
    const l = await this.slides.length();
    const current = await this.slides.getActiveIndex();
    this.slidesLeft = l - current - 2;

    //Get the number of dots equal to slides left and display them
    if (current < 5) {
      //stops anything being displayed on slides after last one
      const slice = Array.from(dots).slice(0, this.slidesLeft);
      slice.forEach((element) =>
        this.renderer.setStyle(element.nativeElement, "display", "block")
      );
    }

    //Get correct icon to display
    if (current < 5) {
      this.renderer.setStyle(map[current], "display", "block");
    }
  }

  /**
   * From the current values of the fields, returns the index of the earliest
   * slide that has invalid or missing information.
   *
   * CAREFUL: the slide indexes are based on the property "slideIndexes", which is fixed
   * and not dynamically updated by changes in the template. Changes in the order of the template
   * may therefore change its validity.
   */
  getfirstInvalidSlideIndex(): number | null {
    const fieldValues = this.formValues;
    const initIndex = 100;
    let slideIndex: number = initIndex;

    // checks whether each field has a value and if that value is valid
    Object.keys(this.slideIndexes).forEach((field) => {
      if (field === "pictures") {
        // checks first whether that field exists / contains a value
        // and then whether there is at least one picture in the pictures array (the others should be null)
        if (!(fieldValues[field] && fieldValues[field].filter(Boolean).length > 0)) {
          slideIndex = Math.min(slideIndex, this.slideIndexes[field]);
        }
      } else {
        // checks whether element exists / is non null & whether its value is valid
        if (!(fieldValues[field] && !this.form.get(field).invalid)) {
          slideIndex = Math.min(slideIndex, this.slideIndexes[field]);
        }
      }
    });

    return slideIndex === initIndex ? null : slideIndex;
  }

  async onAccountCreationFailure() {
    const alert = await this.loadingAlertManager.createAlert({
      header: "Account creation failed",
      message: `We couldn't complete the creation of your account. 
        Please try to close and reopen the app, and check your internet connection. 
        If the problem persists, abort profile creation when the popup comes up.
        We're sorry for the inconvenience.`,
      buttons: ["Okay"],
      backdropDismiss: false,
    });

    return this.loadingAlertManager.presentNew(alert, "replace-erase");
  }

  async presentPrivacyModal(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: PrivacyModalComponent,

      enterAnimation: SCenterAnimation(),
      leaveAnimation: SCleaveAnimation(),
    });

    return modal.present();
  }

  async presentTermsModal(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: TermsModalComponent,

      enterAnimation: SCenterAnimation(),
      leaveAnimation: SCleaveAnimation(),
    });

    return modal.present();
  }

  validateAndSlidePictures() {
    if (this.picturesHolder.filter((p) => p).length < 1) return;

    this.unlockAndSlideToNext(); // If others valid, slide next
  }

  async unlockAndSlideToNext() {
    await this.slides.lockSwipes(false);
    await this.slides.slideNext();

    let index = await this.slides.getActiveIndex();

    if (index === 5) {
      this.renderer.setStyle(this.slidesRef.nativeElement, "overflow", "visible");
      this.renderer.setStyle(this.slidesRef.nativeElement, "--overflow", "visible");
    }

    await this.updatePager();
    await this.slides.lockSwipes(true);
  }

  async unlockAndSlideToPrev() {
    await this.slides.lockSwipes(false);
    await this.slides.slidePrev();

    await this.updatePager();
    await this.slides.lockSwipes(true);
  }

  async unlockAndSlideTo(index: number) {
    await this.slides.lockSwipes(false);
    await this.slides.slideTo(index);

    await this.updatePager();
    await this.slides.lockSwipes(true);
  }

  updateAge(age: number) {
    this.age = age;
    this.changeDetectorRef.detectChanges();
  }

  getReqValidatorChecks() {
    return {
      firstName: document.getElementById("nameCheck"),
      dateOfBirth: document.getElementById("dateCheck"),
      sexualPreference: document.getElementById("sexCheck"),
      gender: document.getElementById("genderCheck"),
      university: document.getElementById("uniCheck"),
      degree: document.getElementById("degreeCheck"),
    };
  }

  async playVideo() {
    return firstValueFrom(this.videoPlayerRef$).then((ref) => ref.nativeElement.play());
  }

  async pauseVideo() {
    return firstValueFrom(this.videoPlayerRef$).then((ref) => ref.nativeElement.pause());
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }
}
