import {
  ChangeDetectorRef,
  Component,
  OnInit,
  ViewChild,
  ViewChildren,
  ElementRef,
  QueryList,
} from "@angular/core";
import { FormGroup, FormControl, FormArray, FormBuilder } from "@angular/forms";
import { IonSlides } from "@ionic/angular";
import { Router } from "@angular/router";

import {
  searchCriteriaOptions,
  questionsOptions,
  SignupOptional,
  AreaOfStudy,
  Interests,
  SocietyCategory,
  QuestionAndAnswer,
  successResponse,
  SocialMediaLink,
} from "@interfaces/index";
import { allowOptionalProp } from "@interfaces/shared.model";
import { SignupService } from "@services/signup/signup.service";
import { QuestionSlidesComponent } from "@components/index";

@Component({
  selector: "app-signupoptional",
  templateUrl: "./signupoptional.page.html",
  styleUrls: ["../welcome.page.scss"],
})
export class SignupoptionalPage implements OnInit {
  @ViewChild("interestSlides", { read: ElementRef }) interestSlides: ElementRef;
  @ViewChild("slides") slides: IonSlides;
  @ViewChildren("pagerDots", { read: ElementRef }) dots: QueryList<ElementRef>;
  @ViewChild('qSlides') qSlides: QuestionSlidesComponent;

  slidesLeft: number;

  questionArray: QuestionAndAnswer[];

  // FIELD FORM
  form = new FormGroup({
    course: new FormControl(null),
    areaOfStudy: new FormControl(null),
    interests: new FormArray([]),
    society: new FormControl(null),
    societyCategory: new FormControl(null),
    questions: new FormArray([
      new FormGroup({
        q: new FormControl(''),
        a: new FormControl('')
      })
    ]),
    biography: new FormControl(null),
    onCampus: new FormControl(null),
    instagramLink: new FormGroup({
      socialMedia: new FormControl("instagram"),
      link: new FormControl(null),
    }),
  });

  // I think the order should be :
  // course & areaOfStudy, society & societyCategory, interests, questions, biography, onCampus

  // OPTIONS
  societyCategoryOptions = searchCriteriaOptions.societyCategory;
  areaOfStudyOptions = searchCriteriaOptions.areaOfStudy;
  interestsOptions = searchCriteriaOptions.interests;
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
    socialMediaLinks: 6,
  };

  constructor(
    private signup: SignupService,
    private router: Router,
    private changeDetectorRef: ChangeDetectorRef,
    private formBuilder: FormBuilder
  ) {}

  ngOnInit() {
    this.clearFormArray(this.form.controls.questions as FormArray);
  }

  /**
   * Empties a FormArray (given as input) of all its values
   */
  clearFormArray(formArray: FormArray) {
    while (formArray.length !== 0) {
      formArray.removeAt(0)
    };
  }

  async ionViewWillEnter() {
    await this.fillFieldsAndGoToSlide(); //Might need to be moved this to ionViewDidEnter hook
    // await this.slides.lockSwipes(true);
  }

  ionViewDidEnter() {
    console.log(this.interestSlides.nativeElement.pictures);
    console.log(this.interestSlides.nativeElement.interests);
    this.updatePager();
  }

  /**
   * Pushes a new question to the questions formArray (thereby showing in the template)
   */
   addQuestion(input) {
    const questionArray = this.form.controls.questions as FormArray;
    questionArray.push(this.initQuestion(input[0], input[1]));
    
    this.changeDetectorRef.detectChanges(); // forces Angular to check updates in the template
  }

  /**
   * Removes specific question from formArray
   */
  removeQuestion(index: number) {
    const questionArray = this.form.controls.questions as FormArray;
    questionArray.removeAt(index);
    
    this.changeDetectorRef.detectChanges(); // forces Angular to check updates in the template
  }

  /**
   * Builds group of Q/A combo to push to FormArray based on input
   */
  initQuestion(q, a) {
    return new FormGroup({
      q: new FormControl(q),
      a: new FormControl(a)
    });
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

    //Hide all pager dots also
    var dots = this.dots.toArray();
    dots.forEach((element) => (element.nativeElement.style.display = "none"));

    //Get current slide index and calculate slides left after this one
    var l = await this.slides.length();
    var current = await this.slides.getActiveIndex();
    this.slidesLeft = l - current - 1;

    //Get the number of dots equal to slides left and display them
    var slice = dots.slice(0, this.slidesLeft);
    slice.forEach((element) => (element.nativeElement.style.display = "block"));

    //Get correct icon to display
    map[current].style.display = "block";
  }

  /**
   * Grabs all questions and answers from question slides component and adds them to form array
   * This is the only way currently written to submit them to the form
   */
  async submitQuestions() {
    this.clearFormArray(this.form.controls.questions as FormArray); 
    //Clears any previous answers to avoid pushing same twice

    for (let i = 0; i < this.qSlides.questionArray.length; i++) {
      this.addQuestion([
        this.qSlides.questionArray[i], 
        this.qSlides.answerArray[i]
      ]);
    };

    this.unlockAndSlideToNext();
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
   * slide that has invalid (ONLY, as opposed to required which also accounts for missing fields)
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
      // ***************** HANDLE FACT THAT OPTIONAL ELEMENTS CAN BE EMPTY ********************
      // **************************************************************************************

      // checks whether element exists / is non null & whether its value is valid
      if (!this.form.get(field).valid) {
        slideIndex = Math.min(slideIndex, this.slideIndexes[field]);
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
      if (field === "interests") {
        this.form.setControl(field, this.formBuilder.array(data[field] || []));
      } else if (field === "questions") {
        const questionFormGroups = (data[field] as QuestionAndAnswer[]).map((QandA) =>
          this.formBuilder.group({ q: QandA.question, a: QandA.answer })
        );
        this.form.setControl(field, this.formBuilder.array(questionFormGroups || []));
        this.qSlides.writeValue(this.form.controls.questions.value);
      } else {
        const formControl = this.form.get(field);
        if (formControl) formControl.setValue(data[field]);
      }
    });
  }

  // USE THIS TO UPDATE THE DATA OBSERVABLE AT EACH SWIPE AS WELL AS TO STORE IT LOCALLY
  updateData(): Promise<void> {
    const validData = {};

    // MIGHT HAVE TO PASS THE PICTURES AS BASE64STRINGS HERE IF YOU WANT TO STORE THEM
    return this.signup.addToDataHolders(this.getFormValues());
  }

  getFormValues(): SignupOptional {
    const course: string = this.form.get("course").value;
    const areaOfStudy: AreaOfStudy = this.form.get("areaOfStudy").value;
    const interests: Interests[] = this.form.get("interests").value;
    const society: string = this.form.get("society").value;
    const societyCategory: SocietyCategory = this.form.get("societyCategory").value;
    const questions: QuestionAndAnswer[] = (
      this.form.get("questions").value as Array<any>
    ).map((qst) => {
      return { question: qst.q, answer: qst.a };
    });
    const biography: string = this.form.get("biography").value;

    // TEMPORARY AND WRONG (need to ask for geolocalisation and shit, should probably create a store for this shit)
    const onCampus: boolean = this.form.get("onCampus").value;

    const socialMediaLinks: SocialMediaLink[] = [this.form.get("instagramLink").value];

    return {
      course,
      areaOfStudy,
      interests,
      society,
      societyCategory,
      questions,
      biography,
      onCampus,
      socialMediaLinks,
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
      this.signup.createFirestoreAccount().subscribe(async (res: successResponse) => {
        if (res.successful) {
          console.log("THAT FCKIN WORKED");
          await this.signup.removeLocalStorage();
          await this.signup.initializeUser();
          await this.router.navigateByUrl("/main/home");
        } else {
          console.error("Signup was unsuccessful. HANDLE");
        }
      });
      this.router.navigateByUrl("/welcome/signupoptional");
    }
  }
}

// next to do here:
// - change submit function so that:
//       - either it redirects to an INVALID field (an empty field is fine as shit is optional here)
//       -  either it: does a final save of the data to the observable, submits the data to the database to create the account
//     upon success: delete the signup local storage, initialize the stores, direct to home
//     upon failure, make sure that doesn't happen lmao
// - make all validators accurate for all data

// not directly related but necessary:
// - fix picture logic in register-swipe-stack: should we not store anything in userSnippets and just fetch
// it from the app (since it's very straightforward), or store there a picture in base64 format? Keep in mind the
// picture can be low quality since the image is displayed in very small. But fetching it from the database is not bad
// since it will make sure it is completely up to date (no possible mismatch between the true pictures of the user and what is shown
// in the small circle profile tingy).
// - implement asking for geolocalisation and whole onCampus shit (other things might be worth doing before hand, that could come at a later stage)
// - implement email verification logic (that means we create the account (and hence init local data signup storage will still being in auth
// part, so we must have an additional field there that says whether email verification has been full filled, that way,
// you are taken there if it hasn't yet)
// - before anything is added to the observable, validate it (only add those that are okay by the validators, filter the rest out (for both required and optional))
// - handle social media links (i.e. generally find how that works (do you just need a url?), how to ask for it in the signup process,
// how it is displayed, and what should be stored in the database)

// next to do immediatly
// - upload account creation cloud function to firebase
// - update all "interests" properties to "interests"
// - test creating a new account
