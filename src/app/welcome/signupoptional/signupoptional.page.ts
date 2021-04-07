import {
  ChangeDetectorRef,
  Component,
  OnInit,
  ViewChild,
  ElementRef,
} from "@angular/core";
import { FormGroup, FormControl, FormArray } from "@angular/forms";
import { IonSlides } from "@ionic/angular";
import { Router } from "@angular/router";

import {
  searchCriteriaOptions,
  questionsOptions,
  SignupOptional,
  AreaOfStudy,
  Interest,
  SocietyCategory,
  QuestionAndAnswer,
} from "@interfaces/index";
import { allowOptionalProp } from "@interfaces/shared.model";
import { SignupService } from "@services/signup/signup.service";

@Component({
  selector: "app-signupoptional",
  templateUrl: "./signupoptional.page.html",
  styleUrls: ["../welcome.page.scss"],
})
export class SignupoptionalPage implements OnInit {
  @ViewChild("interestSlides", { read: ElementRef }) interestSlides: ElementRef;
  @ViewChild("slides") slides: IonSlides;

  slidesLeft: number;

  // FIELD FORM
  form = new FormGroup({
    course: new FormControl(null),
    areaOfStudy: new FormControl(null),
    interests: new FormControl(null),
    society: new FormControl(null),
    societyCategory: new FormControl(null),
    questions: new FormArray([]),
    biography: new FormControl(null),
    onCampus: new FormControl(null),
  });

  /**
   * Pushes a new question to the questions formArray (thereby showing in the template)
   */
  addQuestion() {
    const questionArray = this.form.get("questions") as FormArray;
    console.log(questionArray);
    questionArray.push(
      new FormGroup({
        q: new FormControl(null),
        a: new FormControl(null),
      })
    );
    this.changeDetectorRef.detectChanges(); // forces Angular to check updates in the template
  }

  // I think the order should be :
  // course & areaOfStudy, society & societyCategory, interests, questions, biography, onCampus

  // OPTIONS
  societyCategoryOptions = searchCriteriaOptions.societyCategory;
  areaOfStudyOptions = searchCriteriaOptions.areaOfStudy;
  interestsOptions = searchCriteriaOptions.interest;
  questionsOptions = questionsOptions;

  selectedInterests: Array<string> = [];

  // Getting these dynamically would be absolutely amazing, not sure how to however
  slideIndexes: { [k in keyof SignupOptional]: number } = {
    course: 0,
    areaOfStudy: 0,
    interests: 1,
    society: 2,
    societyCategory: 2,
    questions: 3,
    biography: 4,
    onCampus: 5,
  };

  constructor(
    private signup: SignupService,
    private router: Router,
    private changeDetectorRef: ChangeDetectorRef
  ) {}

  ngOnInit() {}

  async ionViewWillEnter() {
    //await this.fillFieldsAndGoToSlide();
    //await this.slides.lockSwipes(true);
    await this.updatePager();
  }

  ionViewDidEnter() {
    console.log(this.interestSlides);
    console.log(this.interestSlides.nativeElement.pictures);
    console.log(this.interestSlides.nativeElement.interests);
  }

  /*
   * Function to get the current slider and update the pager icons accordingly, no inputs
   * Should be called on launch and after a slide is changed each time
   */
  async updatePager() {
    //Retrieve all icons as element variables
    var book = document.getElementById("book");
    var people = document.getElementById("people");
    var chatbox = document.getElementById("chatbox");
    var palette = document.getElementById("palette");
    var bio = document.getElementById("bio");
    var insta = document.getElementById("insta");

    //Hash maps are quickest and most efficient; keys are slide numbers, values are icon to show
    var map = {
      0: book,
      1: people,
      2: chatbox,
      3: palette,
      4: bio,
      5: insta,
    };

    //Initially display none
    Object.values(map).forEach((element) => (element.style.display = "none"));

    //Signuprequired is still present in document, so this gets all pager dots including signuprequired.
    //This means we also have to slice for dots just on this page.
    var allDots: HTMLCollectionOf<any> = document.getElementsByClassName("pager-dot");

    var dots = Array.from(allDots).slice(4, 9); //Select only dots on signupoptional
    dots.forEach((element) => (element.style.display = "none"));

    //Get current slide index and calculate slides left after this one
    var l = await this.slides.length();
    var current = await this.slides.getActiveIndex();
    this.slidesLeft = l - current - 1;

    //Get the number of dots equal to slides left and display them
    var slice = dots.slice(0, this.slidesLeft);
    slice.forEach((element) => (element.style.display = "block"));

    //Get correct icon to display
    map[current].style.display = "block";
  }

  async unlockAndSlideToNext() {
    await this.slides.lockSwipes(false);
    await this.slides.slideNext();

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

  item = {
    checked: false,
  };

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
    const initIndex = 100;
    let slideIndex: number = initIndex;

    // checks whether each field has a value and if that value is valid
    Object.keys(this.slideIndexes).forEach((field) => {
      // **************************************************************************************
      // *************************** ADAPT TO OPTIONAL SIGNUP *********************************
      // **************************************************************************************
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
  fillFields(data: allowOptionalProp<SignupOptional>): void {
    Object.keys(data).forEach((field) => {
      // **************************************************************************************
      // *************************** ADAPT TO OPTIONAL SIGNUP *********************************
      // **************************************************************************************
      if (field === "pictures") {
        // if (data[field]) {
        //   console.log(data[field]);
        //   data[field].forEach((pic, i) => {
        //     this.savePhoto({ photo: pic, index: i });
        //   });
        // }
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

  getFormValues(): SignupOptional {
    const course: string = this.form.get("course").value;
    const areaOfStudy: AreaOfStudy = this.form.get("areaOfStudy").value;
    const interests: Interest[] = this.form.get("interests").value;
    const society: string = this.form.get("society").value;
    const societyCategory: SocietyCategory = this.form.get("societyCategory").value;

    // CHANGE TO MATCH SHAPE OF QUESTIONS, MIGHT HAVE TO DO SAME FOR INTERESTS
    const questions: QuestionAndAnswer[] = this.form.get("questions").value;
    const biography: string = this.form.get("biography").value;

    // TEMPORARY AND WRONG (need to ask for geolocalisation and shit, should probably create a store for this shit)
    const onCampus: boolean = this.form.get("onCampus").value;

    return {
      course,
      areaOfStudy,
      interests,
      society,
      societyCategory,
      questions,
      biography,
      onCampus,
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
}

// next to do here:
// - discuss with Ewan new way to display questions logic (maybe initial screen just shows an
// "add question" button which once clicked, slides of the possible questions pop up, (same style as for interests) and once selected
// the question slides disappear showing the "add question" button shifted down to leave space for the question selected and a field below
// to enter the answer. New questions can be added by clicking the add question button and same procedure is followed. A cross is shown
// for each question to delete it)
// - format the "questions" right (use FormArray of FormGroups of two FormControls)
// - maybe do the same thing for interests (use FormArray)
// - make "fillFields" right
// - change submit function so that:
//       - either it redirects to an INVALID field (an empty field is fine as shit is optional here)
//       -  either it: does a final save of the data to the observable, submits the data to the database to create the account
//     upon success: delete the signup local storage, initialize the stores, direct to home
//     upon failure, make sure that doesn't happen lmao
// - make all validators accurate for all data

// not directly related but necessary:
// - implement asking for geolocalisation and whole onCampus shit (other things might be worth doing before hand, that could come at a later stage)
// - implement email verification logic (that means we create the account (and hence init local data signup storage will still being in auth
// part, so we must have an additional field there that says whether email verification has been full filled, that way,
// you are taken there if it hasn't yet)
// - before anything is added to the observable, validate it (only add those that are okay by the validators, filter the rest out (for both required and optional))
