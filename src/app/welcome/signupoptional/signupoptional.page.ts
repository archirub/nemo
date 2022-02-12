import {
  ChangeDetectorRef,
  Component,
  OnInit,
  ViewChild,
  ViewChildren,
  ElementRef,
  QueryList,
  Renderer2,
} from "@angular/core";
import { IonSlides, NavController } from "@ionic/angular";
import { FormGroup, FormControl, FormArray, FormBuilder } from "@angular/forms";

import { intersection } from "lodash";

import { QuestionSlidesComponent } from "@components/index";

import { SignupService } from "@services/signup/signup.service";

import {
  searchCriteriaOptions,
  questionsOptions,
  SignupOptional,
  AreaOfStudy,
  Interests,
  SocietyCategory,
  QuestionAndAnswer,
  SocialMediaLink,
  allowOptionalProp,
} from "@interfaces/index";
import { LoadingAndAlertManager } from "@services/loader-and-alert-manager/loader-and-alert-manager.service";
import { wait } from "src/app/shared/functions/common";
import { SignupLocalStorageService } from "@services/signup/signup-local-storage.service";

@Component({
  selector: "app-signupoptional",
  templateUrl: "./signupoptional.page.html",
  styleUrls: ["../welcome.page.scss"],
})
export class SignupoptionalPage implements OnInit {
  societyCategoryOptions = searchCriteriaOptions.societyCategory;
  areaOfStudyOptions = searchCriteriaOptions.areaOfStudy;
  interestsOptions = searchCriteriaOptions.interests;
  questionsOptions = questionsOptions;
  slideIndexes: { [k in keyof SignupOptional]: number } = {
    course: 0,
    areaOfStudy: 0,
    society: 1,
    societyCategory: 1,
    questions: 2,
    interests: 3,
    biography: 4,
    socialMediaLinks: 5,
  };

  slidesLeft: number;
  questionArray: QuestionAndAnswer[];
  selectedInterests: Array<string> = [];
  form = this.blankForm;

  @ViewChild("slides") slides: IonSlides;
  @ViewChildren("pagerDots", { read: ElementRef }) dots: QueryList<ElementRef>;
  @ViewChild("qSlides") questionSlides: QuestionSlidesComponent;

  get blankForm() {
    return new FormGroup({
      course: new FormControl(null),
      areaOfStudy: new FormControl(null),
      interests: new FormControl([]),
      society: new FormControl(null),
      societyCategory: new FormControl(null),
      questions: new FormArray([
        new FormGroup({
          q: new FormControl(""),
          a: new FormControl(""),
        }),
      ]),
      biography: new FormControl(null),
      socialMediaLinks: new FormArray([]),
    });
  }

  constructor(
    private signup: SignupService,
    private changeDetectorRef: ChangeDetectorRef,
    private formBuilder: FormBuilder,
    private navCtrl: NavController,
    private renderer: Renderer2,

    private loadingAlertManager: LoadingAndAlertManager
  ) {}

  ngOnInit() {
    this.clearFormArray(this.form.controls.questions as FormArray);
  }

  ionViewWillEnter() {
    this.signup.getLocalStorage();
  }

  ionViewDidEnter() {
    this.fillFieldsAndGoToSlide().then(() => this.updatePager());
  }

  async onGoToNextSlide() {
    console.log("onGoToNextSlide");
    const currentSlideIndex = await this.slides.getActiveIndex();
    const isValid = await this.slideIsValid(currentSlideIndex);
    if (isValid) return this.unlockAndSlideToNext();
  }

  async onSkipSlide() {
    const currentSlideIndex = await this.slides.getActiveIndex();
    const fieldsOnCurrentSlide = await this.getFieldsOnSlide(currentSlideIndex);

    // resetting controls of current slide
    fieldsOnCurrentSlide.forEach((field) => {
      const emptyFieldControl = this.blankForm.get(field);
      console.log(field, emptyFieldControl);
      if (!emptyFieldControl) return;
      this.form.setControl(field, emptyFieldControl);
      if (field === "questions") {
        this.questionSlides.resetSlides();
      }
    });

    return this.unlockAndSlideToNext();
  }

  /**
   * Checks whether all the data is valid, if it isn't redirect to slide of unvalid data,
   * if it is, then save the data and direct to signupoptional
   */
  async onSubmit() {
    const loader = await this.loadingAlertManager.createLoading({
      message: "Setting up your account...",
    });
    await this.loadingAlertManager.presentNew(loader, "replace-erase");

    const slideCount = await this.slides.length();
    const invalidSlide = await this.getFirstInvalidSlideIndex();
    // go to slide if invalidSlide is non null and that it isn't the last slide
    if (invalidSlide && invalidSlide + 1 !== slideCount) {
      const alert = await this.loadingAlertManager.createAlert({
        backdropDismiss: false,
        header: "We found some invalid data...",
        buttons: ["Go to field"],
      });

      alert.onDidDismiss().then(() => this.unlockAndSlideTo(invalidSlide));

      await this.loadingAlertManager.dismissDisplayed();

      return this.loadingAlertManager.presentNew(alert, "replace-erase");
    }

    await this.updateData();

    try {
      await this.signup.createFirestoreAccount();
    } catch (e) {
      await this.loadingAlertManager.dismissDisplayed();
      await this.onAccountCreationFailure();
    }

    await this.signup.initializeUser();

    await wait(200);

    await this.loadingAlertManager.dismissDisplayed();

    await wait(200);

    return this.navCtrl.navigateForward("/welcome/signup-to-app");
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
    const currentSignupData = this.signup.signupData$.value; // only getting a snapshot instead of subscribing as we only want to use this function once at the start, not change swipe whenever

    // creating object with ONLY required fields and their values from signupData observable
    const optionalData = {};
    Object.keys(currentSignupData).forEach((field) => {
      if (formFields.includes(field)) {
        optionalData[field] = currentSignupData[field];
      }
    });

    // filling fields
    this.fillFields(optionalData);

    // moving to slide of index with earliest incomplete fields
    // if there is none, then moving to last slide
    await this.unlockAndSlideTo(
      this.getFirstIncompleteSlideIndex() ?? (await this.slides.length())
    );
  }

  // USE THIS TO UPDATE THE DATA OBSERVABLE AT EACH SWIPE AS WELL AS TO STORE IT LOCALLY
  updateData(): Promise<void> {
    const validData = {};
    // MIGHT HAVE TO PASS THE PICTURES AS BASE64STRINGS HERE IF YOU WANT TO STORE THEM
    return this.signup.addToDataHolders(this.getFormValues());
  }

  async getFieldsOnSlide(indexOfChoice: number) {
    let fieldsOnCurrentSlide: (keyof SignupOptional)[] = [];

    Object.entries(this.slideIndexes).forEach(
      ([fieldName, slideIndex]: [keyof SignupOptional, number]) =>
        slideIndex === indexOfChoice ? fieldsOnCurrentSlide.push(fieldName) : null
    );

    return fieldsOnCurrentSlide;
  }

  /**
   * From the data provided, fills the fields in the template
   */
  fillFields(data: allowOptionalProp<SignupOptional>): void {
    Object.keys(data).forEach((field: keyof SignupOptional) => {
      // if (field === "interests") {
      //   this.form.setControl(field, this.formBuilder.array(data[field] || []));
      if (field === "questions") {
        const questionFormGroups = ((data[field] as QuestionAndAnswer[]) || []).map(
          (QandA) => this.formBuilder.group({ q: QandA.question, a: QandA.answer })
        );
        this.form.setControl(field, this.formBuilder.array(questionFormGroups || []));
        this.questionSlides.writeValue(this.form.controls.questions.value);
      } else if (field === "socialMediaLinks") {
        const socialMediaFormGroups = ((data[field] as SocialMediaLink[]) || []).map(
          (sm) => this.formBuilder.group({ socialMedia: sm.socialMedia, link: sm.link })
        );
        this.form.setControl(field, this.formBuilder.array(socialMediaFormGroups || []));
      } else {
        const formControl = this.form.get(field);
        if (formControl) formControl.setValue(data[field]);
      }
    });
  }

  /**
   * From the current values of the fields, returns the index of the earliest
   * slide that has incomplete data or incorrect data. This is used when the user is moved
   * to this page so that they can continue completing from the earliest empty field
   *
   * CAREFUL: the slide indexes are based on the property "slideIndexes", which is fixed
   * and not dynamically updated by changes in the template. Changes in the order of the template
   * may therefore change its validity.
   */
  getFirstIncompleteSlideIndex(): number | null {
    const fieldValues = this.getFormValues();
    const initIndex = 100;
    let slideIndex: number = initIndex;

    // checks whether each field has a value and if that value is valid
    Object.keys(this.slideIndexes).forEach((field: keyof SignupOptional) => {
      const formControl = this.form.get(field);

      if (!formControl) return;

      if (
        (field === "questions" || field === "interests") &&
        Array.isArray(formControl.value) &&
        formControl.value.filter(Boolean).length < 1
      ) {
        slideIndex = Math.min(slideIndex, this.slideIndexes[field]);
      }
      // checks whether element exists / is non null & whether it has a value
      else if (!formControl.value || !formControl.valid) {
        slideIndex = Math.min(slideIndex, this.slideIndexes[field]);
      }
    });

    return slideIndex === initIndex ? null : slideIndex;
  }

  /**
   * As opposed to getFirstIncompleteSlideIndex, this method checks only for whether the
   * element is invalid. This is used right before the form is submitted to create the documents
   * on the database
   *
   * CAREFUL: the slide indexes are based on the property "slideIndexes", which is fixed
   * and not dynamically updated by changes in the template. Changes in the order of the template
   * may therefore change its validity.
   */
  async getFirstInvalidSlideIndex() {
    const fieldValues = this.getFormValues();
    const initIndex = 100;
    let slideIndex: number = initIndex;

    // checks whether each field has a value and if that value is valid
    await Promise.all(
      Object.keys(this.slideIndexes).map(async (field: keyof SignupOptional) => {
        const formControl = this.form.get(field);

        // checks whether element is valid
        if (!(await this.slideIsValid(this.slideIndexes[field]))) {
          slideIndex = Math.min(slideIndex, this.slideIndexes[field]);
        }
      })
    );

    return slideIndex === initIndex ? null : slideIndex;
  }

  /**
   * checks in particular for whether both course/areaOfStudy or both society/societyCategory
   * are filled or empty, and same for each question answer pair.
   * Everything is optional so anything can be empty, but these pairs need to have the same state
   * of empty or filled
   */
  async slideIsValid(slideIndex: number) {
    const fieldsOnCurrentSlide = await this.getFieldsOnSlide(slideIndex);
    const isFilled = (v) => typeof v === "string" && v.length > 0;
    const isEmpty = (v) => !v;
    const bothNullOrFilled = (v1, v2) =>
      (isFilled(v1) && isFilled(v2)) || (isEmpty(v1) && isEmpty(v2));

    if (intersection(fieldsOnCurrentSlide, ["course", "areaOfStudy"]).length === 2) {
      const courseValue = this.form.get("course").value;
      const areaOfStudyValue = this.form.get("areaOfStudy").value;
      const isValid = bothNullOrFilled(courseValue, areaOfStudyValue);
      if (!isValid) return false;
    }

    if (intersection(fieldsOnCurrentSlide, ["society", "societyCategory"]).length === 2) {
      const societyValue = this.form.get("society").value;
      const societyCategoryValue = this.form.get("societyCategory").value;
      const isValid = bothNullOrFilled(societyValue, societyCategoryValue);
      if (!isValid) return false;
    }

    if (fieldsOnCurrentSlide.includes("questions")) {
      const questionsValue: QuestionAndAnswer[] = (
        this.form.get("questions").value as Array<any>
      ).map((qst) => {
        return { question: qst.q, answer: qst.a };
      });
      let isValid = true;
      questionsValue.forEach((QandA) =>
        !bothNullOrFilled(QandA.answer, QandA.question) ? (isValid = false) : null
      );
      if (!isValid) return false;
    }

    return true;
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
    // const onCampus: boolean = this.form.get("onCampus").value;

    const socialMediaLinks: SocialMediaLink[] = this.form.get("socialMediaLinks").value;

    return {
      course,
      areaOfStudy,
      interests,
      society,
      societyCategory,
      questions,
      biography,
      // onCampus,
      socialMediaLinks,
    };
  }

  /**
   * Empties a FormArray (given as input) of all its values
   */
  clearFormArray(formArray: FormArray) {
    while (formArray.length !== 0) {
      formArray.removeAt(0);
    }
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
      a: new FormControl(a),
    });
  }

  /*
   * Function to get the current slider and update the pager icons accordingly, no inputs
   * Should be called on launch and after a slide is changed each time
   */
  async updatePager() {
    //Retrieve all icons as element variables
    const book = document.getElementById("book");
    const people = document.getElementById("people");
    const chatbox = document.getElementById("chatbox");
    const palette = document.getElementById("palette");
    const bio = document.getElementById("bio");
    const insta = document.getElementById("insta");

    //Hash maps are quickest and most efficient; keys are slide numbers, values are icon to show
    const map = {
      0: book,
      1: people,
      2: chatbox,
      3: palette,
      4: bio,
      5: insta,
    };

    //Initially display none
    Object.values(map).forEach((element) =>
      this.renderer.setStyle(element, "display", "none")
    );

    //Hide all pager dots also
    const dots = this.dots.toArray();
    dots.forEach((element) =>
      this.renderer.setStyle(element.nativeElement, "display", "none")
    );

    //Get current slide index and calculate slides left after this one
    const l = await this.slides.length();
    const current = await this.slides.getActiveIndex();
    this.slidesLeft = l - current - 1;

    //Get the number of dots equal to slides left and display them
    const slice = dots.slice(0, this.slidesLeft);
    slice.forEach((element) =>
      this.renderer.setStyle(element.nativeElement, "display", "block")
    );

    //Get correct icon to display
    this.renderer.setStyle(map[current], "display", "block");
  }

  /**
   * Grabs all questions and answers from question slides component and adds them to form array
   * This is the only way currently written to submit them to the form
   */
  async questionsOnGoToNextSlide() {
    this.clearFormArray(this.form.controls.questions as FormArray);
    //Clears any previous answers to avoid pushing same twice

    for (let i = 0; i < this.questionSlides.questionArray.length; i++) {
      this.addQuestion([
        this.questionSlides.questionArray[i],
        this.questionSlides.answerArray[i],
      ]);
    }

    return this.onGoToNextSlide();
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
    if (!index) return;
    await this.slides.lockSwipes(false);
    await this.slides.slideTo(index);

    await this.updatePager();
    await this.slides.lockSwipes(true);
  }
}
