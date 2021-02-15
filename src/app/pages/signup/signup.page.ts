import { FormControl, FormGroup } from "@angular/forms";
import { Component, OnInit, ViewChild } from "@angular/core";
import { IonSlides } from "@ionic/angular";
import { CameraResultType, CameraSource, Capacitor, Plugins } from "@capacitor/core";
import { profileFromDatabase, SignupMap } from "@interfaces/index";

type signupFor = FormGroup & { value: SignupMap };

@Component({
  selector: "app-signup",
  templateUrl: "./signup.page.html",
  styleUrls: ["./signup.page.scss"],
})
export class SignupPage implements OnInit {
  @ViewChild("slides") slides: IonSlides;

  signupForm: signupFor = new FormGroup({
    email: new FormControl(null),
    password: new FormControl(null),
    firstNamee: new FormControl(null),
    lastName: new FormControl(null),
    dateOfBirth: new FormControl(null),
    pictures: new FormControl(null),
    biography: new FormControl(null),
    university: new FormControl(null),
    course: new FormControl(null),
    society: new FormControl(null),
    areaOfStudy: new FormControl(null),
    societyCategory: new FormControl(null),
    interests: new FormControl(null),
    questions: new FormControl(null),
    location: new FormControl(null),
  });

  constructor() {}

  ngOnInit() {}

  ngAfterViewInit() {
    this.slides.lockSwipes(true);
    this.pagerUpdate();
  }

  async unlockAndSwipe(direction) {
    this.slides.lockSwipes(false);

    if (direction=="next") {
      this.slides.slideNext()
    } else if (direction=="prev") {
      this.slides.slidePrev()
    } else if (typeof direction === "number") {
      this.slides.slideTo(direction)
    } else {
      console.log("Correct direction not provided.");
    };

    this.slides.lockSwipes(true);
    this.pagerUpdate();

    var current = await this.slides.getActiveIndex();
    if (current==6) {
      this.waveFade();
    };
  }

  /* Updates the pager to current slide, run on every unlockAndSwipe() */
  async pagerUpdate() {
    var pager:any = document.getElementsByClassName("pager")[0];
    var logos = [document.getElementsByName("mail-outline")[0],
                document.getElementsByName("ellipsis-horizontal")[0],
                document.getElementsByName("person")[0],
                document.getElementsByName("gift-outline")[0],
                document.getElementsByName("camera-outline")[0],
                document.getElementsByName("happy-outline")[0],
                document.getElementsByName("school-outline")[0],
                document.getElementsByName("school-outline")[1], //Placeholder icon for waves slide
                document.getElementsByName("location-outline")[0],
                document.getElementsByName("list-outline")[0],
                document.getElementsByName("color-palette-outline")[0],
                document.getElementsByName("accessibility")[0],
                document.getElementsByName("person-add")[0]];
    var pages:any = document.getElementsByClassName("pager-dot");
    var current = await this.slides.getActiveIndex();

    if (current < 6) {
      var pagesLeft = 5 - current;
    } else {
      var pagesLeft = 12 - current;
      for (let i = 0; i < pages.length; i++) {
        pages[i].style.display = "block";
      };
    };
    
    /* Remove pager for the waves slide */
    if (current === 6) {
      pager.style.display = "none";
    } else {
      pager.style.display = "flex";

      // Initially hide all logos
      logos.forEach(element => element.style.display = "none");
      logos[current].style.display = "block";

      for (let i = 0; i < pages.length; i++) {
        if (i+1 > pagesLeft) {
          pages[i].style.display = "none";
        };
      };
    };
  }

  /* Fade in/out basic pure JS animations */
  fadeIn(HTMLElement) {
    for (let i = 0; i < 11; i ++) {
      setTimeout(() => {
        HTMLElement.style.opacity = i/10;
      }, 50);
    }
  }

  fadeOut(HTMLElement) {
    var fade = setInterval(() => {
      if (HTMLElement.style.opacity > 0) {
        HTMLElement.style.opacity -= 0.1;
      } else {
        clearInterval(fade);
      }
    }, 50)
  }

  /* Fades between waves backgrounds and text on slide 6 */
  waveFade() {
    var slides:any = [document.getElementsByClassName("waves")[0],
                  document.getElementsByClassName("waves")[1]]; //Wave backgrounds

    var text:any = [document.getElementsByClassName("blow-up")[0],
                document.getElementsByClassName("blow-up")[1]]; //Text h1s

    var inFade = setInterval(() => {
      if (slides[0].style.opacity != 0) { //Fade out first slide
        this.fadeOut(slides[0]);
        this.fadeIn(slides[1]);
        this.fadeOut(text[0]);
        this.fadeIn(text[1]);
      } else if (slides[1].style.opacity != 0) { //Fade out second slide
        this.fadeOut(slides[1]);
        this.fadeIn(slides[0]);
        this.fadeOut(text[1]);
        this.fadeIn(text[0]);
      };
    }, 5000)
  }


  // Since we are restricted by the two options we have
  // for image picking (i.e. the Capacitor Camera plugin is great
  // but only allows you to choose one photo at a time, and
  // Cordova imagePicker allows to pick multiple images but doesn't
  // allow you to resize the image or present the height and width you want).
  // What we could do instead is do it in two steps: using the cordova
  // imagePicker to pick the picture, and then, in a second time, the cordova
  // image resizer to then resize each image. We must make it clear to the user
  // that first they will pick the pictures and then resize the images.
  onPickPicture() {
    if (!Capacitor.isPluginAvailable("Camera")) {
      return;
    }
    Plugins.Camera.getPhoto({
      quality: 50,
      source: CameraSource.Prompt,
      correctOrientation: true,
      height: 300,
      width: 300,
      resultType: CameraResultType.Base64,
      allowEditing: true,
    }).then((image) => console.log(image));
  }

  item = {
    checked: false,
  }
}
