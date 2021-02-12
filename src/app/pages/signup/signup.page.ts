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

  unlockAndSwipe(direction) {
    this.slides.lockSwipes(false);

    if (direction=="next") {
      this.slides.slideNext()
    } else if (direction=="prev") {
      this.slides.slidePrev()
    } else {
      console.log("Correct direction not provided.");
    };

    this.slides.lockSwipes(true);
    this.pagerUpdate();
  }

  async pagerUpdate() {
    var logos = [document.getElementsByName("mail-outline")[0],
                document.getElementsByName("shield-outline")[0],
                document.getElementsByName("person-outline")[0],
                document.getElementsByName("ellipsis-horizontal")[0],
                document.getElementsByName("gift-outline")[0],
                document.getElementsByName("camera-outline")[0],
                document.getElementsByName("happy-outline")[0]];
    var pages:any = document.getElementsByClassName("pager-dot");
    var current = await this.slides.getActiveIndex();
    var pagesLeft = 6 - current;

    /* Initially hide all logos */
    logos.forEach(element => element.style.display = "none");
    logos[current].style.display = "block";

    for (let i = 0; i < pages.length; i++) {
      if (i+1 > pagesLeft) {
        pages[i].style.display = "none";
      };
    };
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
