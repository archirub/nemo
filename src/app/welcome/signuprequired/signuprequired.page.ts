// next to do:
// - Implement logic from required in optional
// - Implement data check logic (before uploading to local storage, as well as implement template UI of validity)
// - make guard based on Firebase auth / content of local storage (maybe based on function made in point above)
// - have a skip button on all pages of optional
// - create pipes for sexual preference and gender for template display
// - COMMIT BEFORE DOING BELOW (once entire system above is self sufficient)
// - create function that deletes the token once the account has succesfully been created
// - create function that creates the normal app usage token and stores it locally. As well,
// create function that checks whether that exists (that function is basically already done in autologin)

import { ChangeDetectorRef, Component, ViewChild } from "@angular/core";
import { FormGroup, FormControl, Validators } from "@angular/forms";
import { IonSlides } from "@ionic/angular";
import { Router } from "@angular/router";
import { CameraPhoto } from "@capacitor/core";

import {
  Degree,
  Gender,
  SexualPreference,
  University,
  searchCriteriaOptions,
  sexualPreferenceOptions,
  genderOptions,
} from "@interfaces/index";
import { SignupRequired } from "@interfaces/signup.model";
import { AngularAuthService } from "@services/login/auth/angular-auth.service";

import { SignupService } from "@services/signup/signup.service";
import { allowOptionalProp } from "@interfaces/shared.model";
import { AppDatetimeComponent } from "@components/index";

@Component({
  selector: "app-signuprequired",
  templateUrl: "./signuprequired.page.html",
  styleUrls: ["../welcome.page.scss"],
})
export class SignuprequiredPage {
  @ViewChild("slides") slides: IonSlides;
  @ViewChild("date") date: AppDatetimeComponent;

  // FIELD FORM
  form = new FormGroup({
    firstName: new FormControl(null, [Validators.required, Validators.minLength(1)]),
    dateOfBirth: new FormControl(null, [Validators.required]),
    sexualPreference: new FormControl(null, [Validators.required]),
    gender: new FormControl(null, [Validators.required]),
    university: new FormControl(null, [Validators.required]),
    degree: new FormControl(null, [Validators.required]),
  });

  // OPTIONS
  genderOptions: Gender[] = genderOptions;
  sexualPreferenceOptions: SexualPreference[] = sexualPreferenceOptions;
  universityOptions: University[] = searchCriteriaOptions.university;
  degreeOptions: Degree[] = searchCriteriaOptions.degree;

  pictureCount: number = 4; // defines the number of picture boxes in template, as well as is used in logic to save picture picks
  picturesHolder: CameraPhoto[] = Array.from({ length: this.pictureCount }); // for storing pictures. Separate from rest of form, added to it on form submission

  slidesLeft: number;

  age: number;

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
    private signUpAuthService: AngularAuthService,
    private router: Router,
    private signup: SignupService,
    private changeDetectorRef: ChangeDetectorRef
  ) {}

  async ionViewWillEnter() {
    await this.fillFieldsAndGoToSlide();
    //await this.slides.lockSwipes(true);
    await this.updatePager();
  }

  async updatePager() {
    /* 
    * Function to get the current slider and update the pager icons accordingly, no inputs
    * Should be called on launch and after a slide is changed each time
    */

    //Retrieve all icons as element variables
    var person = document.getElementById("person");
    var gift = document.getElementById("gift");
    var camera = document.getElementById("camera");
    var happy = document.getElementById("happy");
    var school = document.getElementById("school");

    //Hash maps are quickest and most efficient; keys are slide numbers, values are icon to show
    var map = {
      0: person,
      1: gift,
      2: camera,
      3: happy,
      4: school,
    };

    //Initially display none
    Object.values(map).forEach((element) => (element.style.display = "none"));

    //Don't display dots for slides left either
    var dots: HTMLCollectionOf<any> = document.getElementsByClassName("pager-dot");
    Array.from(dots).forEach((element) => (element.style.display = "none"));

    //Get current slide index and calculate slides left after this one
    var l = await this.slides.length();
    var current = await this.slides.getActiveIndex();
    this.slidesLeft = l - current - 2;

    //Get the number of dots equal to slides left and display them
    if (current < 5) { //stops anything being displayed on slides after last one
      var slice = Array.from(dots).slice(0, this.slidesLeft);
      slice.forEach((element) => (element.style.display = "block"));
    }

    //Get correct icon to display
    if (current < 5) {
      map[current].style.display = "block";
    }
  }

  async unlockAndSlideToNext() {
    await this.slides.lockSwipes(false);
    await this.slides.slideNext();

    await this.updatePager();
    //await this.slides.lockSwipes(true);
  }

  async unlockAndSlideToPrev() {
    await this.slides.lockSwipes(false);
    await this.slides.slidePrev();

    await this.updatePager();
    //await this.slides.lockSwipes(true);
  }

  async unlockAndSlideTo(index: number) {
    await this.slides.lockSwipes(false);
    await this.slides.slideTo(index);

    await this.updatePager();
    //await this.slides.lockSwipes(true);
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
    const fieldValues = this.getFormValues();
    const initIndex = 20;
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
        if (!(fieldValues[field] && this.form.get(field).valid)) {
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
    Object.keys(data).forEach((field) => {
      if (field === "pictures") {
        if (data[field]) {
          console.log(data[field]);
          data[field].forEach((pic, i) => {
            this.savePhoto({ photo: pic, index: i });
          });
        }
      } else {
        const formControl = this.form.get(field);
        if (formControl) formControl.setValue(data[field]);
      }
    });
  }

  // USE THIS TO UPDATE THE DATA OBSERVABLE AT EACH SWIPE AS WELL AS TO STORE IT LOCALLY
  updateData(): Promise<void> {
    const validData = {};
    console.log("yo");

    // MIGHT HAVE TO PASS THE PICTURES AS BASE64STRINGS HERE IF YOU WANT TO STORE THEM
    return this.signup.addToDataHolders(this.getFormValues());
  }

  getFormValues(): SignupRequired {
    const firstName: string = this.form.get("firstName").value;
    let dateOfBirth: string = this.form.get("dateOfBirth").value;

    // temporary, to make sure date is null if the thingy hasn't been touched
    if (new Date("2020-01-01").toDateString() === new Date(dateOfBirth).toDateString()) {
      dateOfBirth = null;
    }
    const sexualPreference: SexualPreference = this.form.get("sexualPreference").value;
    const gender: Gender = this.form.get("gender").value;
    // const sexualPreference = ["female" as const];
    // const gender = "male";
    const university: University = this.form.get("university").value;

    const degree: Degree = this.form.get("degree").value;

    const pictures: CameraPhoto[] = this.picturesHolder.filter(Boolean); // removes empty picture slots
    console.log("a", this.picturesHolder, pictures);

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

  /**
   * Checks whether all the data is valid, if it isn't redirect to slide of unvalid data,
   * if it is, then save the data and direct to signupoptional
   */
  async onSubmit() {
    const invalidSlide = this.getFirstInvalidSlideIndex();

    // if invalidSlide is non-null, then there is a slide with invalid data
    // cannot just use if (invalidSlide) {} syntax as number 0 is falsy
    if (typeof invalidSlide === "number") {
      await this.unlockAndSlideTo(invalidSlide);
    } else {
      await this.updateData(); // may not be necessary, but last check to make sure data we have in logic exactly reflects that in the UI
      this.router.navigateByUrl("/welcome/signupoptional");
    }
  }

  goToMain() {
    this.router.navigateByUrl("/main/tabs/home");
    // next to do:
    // - make it so that you can create an account with all the required data (and any of the optional)
    // - create the account in two cases: if the optional part is skipped, or when the optional part if finished
    // - singup token must be changed: while required is being filled out, it must be updated with each new data
    // inputed, so that if someone loses connection, all data that was input is restored. Currently, I believe
    // that the token is only created at the end of the required part, which is a bit stupid and incomplete.
    // if (this.requiredData) this.signUpAuthService.createFullUser(this.requiredData);
  }

  savePhoto(e: { photo: CameraPhoto; index: number }) {
    this.picturesHolder[e.index] = e.photo;
    this.changeDetectorRef.detectChanges(); // forces Angular to check updates in the template
  }
}
