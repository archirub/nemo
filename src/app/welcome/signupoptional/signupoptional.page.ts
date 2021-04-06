import { Component, OnInit, ViewChild, ElementRef } from "@angular/core";
import { FormGroup, FormControl } from "@angular/forms";
import { InterestSlidesComponent } from "@components/index";

import { searchCriteriaOptions, questionsOptions, InterestAndPath } from "@interfaces/index";
import { IonSlides } from "@ionic/angular";

@Component({
  selector: "app-signupoptional",
  templateUrl: "./signupoptional.page.html",
  styleUrls: ["../welcome.page.scss"],
})
export class SignupoptionalPage implements OnInit {
  @ViewChild("slides", { read: ElementRef }) slides: ElementRef; //ISSUE HERE? Won't get methods for IonSlides component?? Has to use ElementRef??
  @ViewChild("interestSlides", { read: ElementRef }) interestSlides : ElementRef;

  slidesLeft: number;

  optionalForm = new FormGroup({
    course: new FormControl(null),
    areaOfStudy: new FormControl(null),
    interests: new FormControl(null),
    society: new FormControl(null),
    societyCategory: new FormControl(null),
    questions: new FormGroup({
      q: new FormControl(null),
      a: new FormControl(null),
    }),
    biography: new FormControl(null),
    onCampus: new FormControl(null),
  });

  // I think the order should be :
  // course & areaOfStudy, society & societyCategory, interests, questions, biography, onCampus

  societyCategoryOptions = searchCriteriaOptions.societyCategory;
  areaOfStudyOptions = searchCriteriaOptions.areaOfStudy;
  interestsOptions = searchCriteriaOptions.interest;
  questionsOptions = questionsOptions;

  selectedInterests: Array<string> = [];

  constructor() {}

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

  async updatePager() {
    /*
     * Function to get the current slider and update the pager icons accordingly, no inputs
     * Should be called on launch and after a slide is changed each time
     */

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
    var l = await this.slides.nativeElement.length();
    var current = await this.slides.nativeElement.getActiveIndex();
    this.slidesLeft = l - current - 1;

    //Get the number of dots equal to slides left and display them
    var slice = dots.slice(0, this.slidesLeft);
    slice.forEach((element) => (element.style.display = "block"));

    //Get correct icon to display
    map[current].style.display = "block";
  }

  async unlockAndSlideToNext() {
    await this.slides.nativeElement.lockSwipes(false);
    await this.slides.nativeElement.slideNext();

    await this.updatePager();
    await this.slides.nativeElement.lockSwipes(true);
  }

  async unlockAndSlideToPrev() {
    await this.slides.nativeElement.lockSwipes(false);
    await this.slides.nativeElement.slidePrev();

    await this.updatePager();
    await this.slides.nativeElement.lockSwipes(true);
  }

  async unlockAndSlideTo(index: number) {
    await this.slides.nativeElement.lockSwipes(false);
    await this.slides.nativeElement.slideTo(index);

    await this.updatePager();
    await this.slides.nativeElement.lockSwipes(true);
  }

  item = {
    checked: false,
  };
  // next to do here:
  // - format the "questions" right (use FormArray of FormGroups of two FormControls)
  // - format interests right
  // - implement data update at each slide swipe
  // - implement "fillFieldsAndGoToSlide"
  // - Implement submit function
}
