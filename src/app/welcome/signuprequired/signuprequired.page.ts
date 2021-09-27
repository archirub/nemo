import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  ViewChild,
  ViewChildren,
  QueryList,
  OnInit,
  Renderer2,
} from "@angular/core";
import { FormGroup, FormControl, Validators } from "@angular/forms";
import { IonCheckbox, IonSelect, IonSlides } from "@ionic/angular";
import { Router } from "@angular/router";

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

import { SignupService } from "@services/signup/signup.service";
import { allowOptionalProp } from "@interfaces/index";
import { AppDatetimeComponent } from "@components/index";
import { UniversitiesStore } from "@stores/universities/universities.service";
import { AngularFireAuth } from "@angular/fire/compat/auth";
import { concatMap, delay, filter, map } from "rxjs/operators";
import { Observable } from "rxjs";

@Component({
  selector: "app-signuprequired",
  templateUrl: "./signuprequired.page.html",
  styleUrls: ["../welcome.page.scss"],
})
export class SignuprequiredPage implements OnInit {
  @ViewChild("slides") slides: IonSlides;
  @ViewChild("slides", { read: ElementRef }) slidesRef: ElementRef;
  @ViewChild("date") date: AppDatetimeComponent;
  @ViewChildren("pagerDots", { read: ElementRef }) dots: QueryList<ElementRef>;
  @ViewChild("tcbox") tcbox: IonCheckbox;
  @ViewChild("ppbox") ppbox: IonCheckbox;
  @ViewChild("universitySelect") universitySelect: IonSelect;

  // UI MAP TO CHECK VALIDATORS, BUILD ON ionViewDidEnter() HOOK
  reqValidatorChecks: object;

  // FIELD FORM
  blankForm = new FormGroup({
    firstName: new FormControl(null, [Validators.required, Validators.minLength(1)]),
    dateOfBirth: new FormControl(
      null
      // [Validators.required]
    ),
    sexualPreference: new FormControl(null, [Validators.required]),
    gender: new FormControl(null, [Validators.required]),
    university: new FormControl(null, [Validators.required]),
    degree: new FormControl(null, [Validators.required]),
  });
  form = this.blankForm; // put this way so that we have a trace of what a blank form is like so that we can reset it

  // OPTIONS
  genderOptions: Gender[] = genderOptions;
  sexualPreferenceOptions: SexualPreference[] = sexualPreferenceOptions;
  degreeOptions: Degree[] = searchCriteriaOptions.degree;
  get universityOptions$(): Observable<UniversityName[]> {
    return this.universitiesStore.optionsList$;
  }

  picturesHolder: string[] = Array.from({ length: MAX_PROFILE_PICTURES_COUNT }); // for storing pictures. Separate from rest of form, added to it on form submission

  slidesLeft: number;

  age: number = 0;
  minDOB: Date;

  universitySelectionDisabled: boolean = false;

  // Getting these dynamically would be absolutely amazing, not sure how to however
  slideIndexes: { [k in keyof SignupRequired]: number } = {
    firstName: 0,
    dateOfBirth: 1,
    pictures: 2,
    sexualPreference: 3,
    gender: 3,
    university: 4,
    degree: 4,
  };

  constructor(
    private router: Router,
    private signup: SignupService,
    private changeDetectorRef: ChangeDetectorRef,
    private universitiesStore: UniversitiesStore,
    private afAuth: AngularFireAuth,
    private renderer: Renderer2
  ) {
    this.form.valueChanges.subscribe((a) =>
      console.log("required form value change:", a)
    );
  }

  ngOnInit() {
    this.universityLogic().subscribe();
  }

  async ionViewWillEnter() {
    // UI elements map to show on invalid checks when trying to move slide, see validateAndSlide()
    this.reqValidatorChecks = {
      firstName: document.getElementById("nameCheck"),
      dateOfBirth: document.getElementById("dateCheck"),
      sexualPreference: document.getElementById("sexCheck"),
      gender: document.getElementById("genderCheck"),
      university: document.getElementById("uniCheck"),
      degree: document.getElementById("degreeCheck"),
    };
  }

  async ionViewDidEnter() {
    await this.signup.getLocalStorage();
    await this.fillFieldsAndGoToSlide();

    await this.date.getWrittenValue();
    await this.date.getDate();

    await this.slides.lockSwipes(true);

    await this.updatePager();
  }

  updateAge(age: number) {
    this.age = age;
    this.changeDetectorRef.detectChanges();
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

  validateAndSlidePictures() {
    if (this.picturesHolder.filter((p) => p).length < 1) return;

    this.unlockAndSlideToNext(); // If others valid, slide next
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
    const currentSignupData = this.signup.signupData.value; // only getting a snapshot instead of subscribing as we only want to use this function once at the start, not change swipe whenever

    // creating object with ONLY required fields and their values from signupData observable
    const requiredData = {};
    Object.keys(currentSignupData).forEach((field) => {
      if (formFields.includes(field)) {
        requiredData[field] = currentSignupData[field];
      }
    });

    // filling fields
    this.fillFields(requiredData);

    // moving to slide of index with earliest incomplete fields
    // if there is none, then moving to last slide
    await this.unlockAndSlideTo(
      this.getFirstInvalidSlideIndex() ?? (await this.slides.length())
    );
  }

  /**
   * From the current values of the fields, returns the index of the earliest
   * slide that has invalid or missing information.
   *
   * CAREFUL: the slide indexes are based on the property "slideIndexes", which is fixed
   * and not dynamically updated by changes in the template. Changes in the order of the template
   * may therefore change its validity.
   */
  getFirstInvalidSlideIndex(): number | null {
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

  /**
   * From the data provided, fills the fields in the template
   * @param data
   */
  fillFields(data: allowOptionalProp<SignupRequired>): void {
    console.log("data coming until fill fields", data);
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
          console.log("field is", field, data[field]);
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

  skipToApp() {
    console.log('Write me! :)');
  }

  /**
   * Checks whether all the data is valid, if it isn't redirect to slide of unvalid data,
   * if it is, then save the data and direct to signupoptional
   */
  async onSubmit() {
    const invalidSlide = this.getFirstInvalidSlideIndex();

    // if invalidSlide is non-null, then there is a slide with invalid data
    // cannot just use if (invalidSlide) {} syntax as number 0 is falsy
    if (typeof invalidSlide === "number") return this.unlockAndSlideTo(invalidSlide);

    await this.updateData(); // may not be necessary, but last check to make sure data we have in logic exactly reflects that in the UI
    return this.router.navigateByUrl("/welcome/signupoptional");
  }

  savePhoto(e: { photoUrl: string; index: number }) {
    this.picturesHolder[e.index] = e.photoUrl;
    this.changeDetectorRef.detectChanges(); // forces Angular to check updates in the template
  }

  universityLogic() {
    return this.afAuth.user.pipe(
      filter((u) => !!u),
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

    // return this.universitiesStore.universities$.pipe(map)
  }
}
