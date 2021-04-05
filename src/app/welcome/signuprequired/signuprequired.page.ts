// next to do:
// - Implement logic from required in optional
// - Implement data check logic (before uploading to local storage, as well as implement template UI of validity)
// - make guard based on Firebase auth / content of local storage (maybe based on function made in point above)
// - have a skip button on all pages of optional
// - COMMIT BEFORE DOING BELOW (once entire system above is self sufficient)
// - create function that deletes the token once the account has succesfully been created
// - create function that creates the normal app usage token and stores it locally. As well,
// create function that checks whether that exists (that function is basically already done in autologin)

import { Component, ViewChild } from "@angular/core";
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

@Component({
  selector: "app-signuprequired",
  templateUrl: "./signuprequired.page.html",
  styleUrls: ["../welcome.page.scss"],
})
export class SignuprequiredPage {
  @ViewChild("slides") slides: IonSlides;

  // defines the number of picture boxes in template, as well as is used in logic to save picture picks
  pictureCount: number = 4;

  // for storing pictures. Separate from rest of form, added to it on form submission
  // NEXT TO DO, INSTEAD OF CHANGING TEMPLATE DIRECTLY IN TAKEPICTURE, CHANGE IT FROM THIS ARRAY, SO THAT
  // WHAT IS DISPLAYED IN THE PICTURE SLOTS COMES DIRECTLY FROM WHAT IS STORED HERE, that way all is consistent
  picturesHolder: CameraPhoto[] = Array.from({ length: this.pictureCount });

  // Options available for those that have default options
  genderOptions: Gender[] = genderOptions;
  sexualPreferenceOptions: SexualPreference[] = sexualPreferenceOptions;
  universityOptions: University[] = searchCriteriaOptions.university;
  degreeOptions: Degree[] = searchCriteriaOptions.degree;

  form = new FormGroup({
    firstName: new FormControl(null, [Validators.required, Validators.minLength(1)]),
    dateOfBirth: new FormControl(null, [Validators.required]),
    sexualPreference: new FormControl(null, [Validators.required]),
    gender: new FormControl(null, [Validators.required]),
    university: new FormControl(null, [Validators.required]),
    degree: new FormControl(null, [Validators.required]),
  });

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
    private signup: SignupService
  ) {}

  ionViewWillEnter() {
    this.fillFieldsAndGoToSlide();
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
    const requiredData = {};

    // only getting a snapshot instead of subscribing as we only want to use this function
    // once at the start, not change swipe whenever
    const currentSignupData = this.signup.signupData.value;

    // creating object with only required fields and their values from signupData observable
    Object.keys(currentSignupData).forEach((field) => {
      if (formFields.includes(field)) {
        requiredData[field] = currentSignupData[field];
      }
    });

    // finds smallest slide index that has incomplete information
    let smallestIncompleteSlide = Math.max(...Object.values(this.slideIndexes));
    formFields.forEach((field) => {
      if (!requiredData[field]) {
        smallestIncompleteSlide = Math.min(
          smallestIncompleteSlide,
          this.slideIndexes[field]
        );
      }
    });

    // filling fields
    this.fillFields(requiredData);

    // moving to slide of index with earliest incomplete fields
    await this.slides.slideTo(smallestIncompleteSlide);
  }

  /**
   * From the data provided, fills the fields in the template
   * @param data
   */
  fillFields(data: allowOptionalProp<SignupRequired>) {
    Object.keys(data).forEach((field) => {
      if (field === "pictures") {
        data[field].forEach((pic, i) => {
          this.savePhoto({ photo: pic, index: i });
        });
      } else {
        const formControl = this.form.get(field);
        if (formControl) formControl.setValue(data[field]);
      }
    });
  }

  // USE THIS TO UPDATE THE DATA OBSERVABLE AT EACH SWIPE AS WELL AS TO STORE IT LOCALLY
  updateData() {
    const validData = {};

    // MIGHT HAVE TO PASS THE PICTURES AS BASE64STRINGS HERE IF YOU WANT TO STORE THEM
    this.signup.addToDataHolders(this.formValues);
  }

  get formValues(): SignupRequired {
    const firstName: string = this.form.get("firstName").value;
    const dateOfBirth: string = this.form.get("dateOfBirth").value;
    const sexualPreference: SexualPreference = this.form.get("sexualPreference").value;
    const gender: Gender = this.form.get("gender").value;
    const university: University = this.form.get("university").value;
    const degree: Degree = this.form.get("degree").value;
    const pictures: CameraPhoto[] = this.picturesHolder.filter(Boolean); // removes empty picture slots

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

  // ************************************REQUIRED**************************************:
  // - logic to show right away when a field is not valid
  // (easily done in template with conditional styling based on validator value).
  // - redirecting to that field when the form is submited while a field is not valid
  onSubmit() {
    const formValues = this.formValues;

    if (!this.form.valid) return console.error("Form is not valid");
    if (formValues.pictures.length < 1)
      return console.error("Form is not valid as no pictures were selected");

    // const successful = this.signUpAuthService.createBaselineUser(myData);
    // if (successful) {
    //   this.router.navigateByUrl("/welcome/signupoptional");
    // }
    this.router.navigateByUrl("/welcome/signupoptional");
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
    const newPictureHolder = [...this.picturesHolder];
    newPictureHolder[e.index] = e.photo;
    this.picturesHolder = newPictureHolder;
  }
}
