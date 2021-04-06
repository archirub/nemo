import { Component, OnInit, ViewChild, ElementRef } from "@angular/core";
import { FormGroup, FormControl } from "@angular/forms";
import { SignupRequired } from "@interfaces/signup.model";
import { IonSlides } from "@ionic/angular";

type optionalForm = FormGroup & { value: SignupRequired };

@Component({
  selector: "app-signupoptional",
  templateUrl: "./signupoptional.page.html",
  styleUrls: ["../welcome.page.scss"],
})
export class SignupoptionalPage implements OnInit {
  @ViewChild("slides", { read: ElementRef }) slides: ElementRef; //ISSUE HERE? Won't get methods for IonSlides component?? Has to use ElementRef??

  slidesLeft: number;

  optionalForm: optionalForm = new FormGroup({
    biography: new FormControl(null),
    society: new FormControl(null),
    // areaOfStudy: new FormControl(null),
    // societyCategory: new FormControl(null),
    // interests: new FormControl(null),
    // questions: new FormControl(null),
    // location: new FormControl(null)
  });

  constructor() {}

  ngOnInit() {}

  async ionViewWillEnter() {
    //await this.fillFieldsAndGoToSlide();
    //await this.slides.lockSwipes(true);
    await this.updatePager();
  }

  async updatePager() {
    /* 
    * Function to get the current slider and update the pager icons accordingly, no inputs
    * Should be called on launch and after a slide is changed each time
    */

    //Retrieve all icons as element variables
    var people = document.getElementById("people");
    var chatbox = document.getElementById("chatbox");
    var palette = document.getElementById("palette");
    var help = document.getElementById("help");
    var bio = document.getElementById("bio");
    var insta = document.getElementById("insta");

    //Hash maps are quickest and most efficient; keys are slide numbers, values are icon to show
    var map = {
      0: people,
      1: chatbox,
      2: palette,
      3: help,
      4: bio,
      5: insta,
    };

    //Initially display none
    Object.values(map).forEach((element) => (element.style.display = "none"));

    //Signuprequired is still present in document, so this gets all pager dots including signuprequired.
    //This means we also have to slice for dots just on this page.
    var allDots: HTMLCollectionOf<any> = document.getElementsByClassName("pager-dot");

    var dots = Array.from(allDots).slice(4,9); //Select only dots on signupoptional
    dots.forEach((element) => (element.style.display = "none"));

    //Get current slide index and calculate slides left after this one
    var l = await this.slides.nativeElement.length();
    var current = await this.slides.nativeElement.getActiveIndex();
    this.slidesLeft = l - current - 1;

    //Get the number of dots equal to slides left and display them
    var slice = dots.slice(0, this.slidesLeft);
    slice.forEach(element => (element.style.display = "block"));

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
}
