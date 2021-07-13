import { Component, ElementRef, OnInit, ViewChild } from "@angular/core";
import { AngularFireAuth } from "@angular/fire/auth";
import { FormControl, FormGroup, Validators } from "@angular/forms";
import { Router } from "@angular/router";
import { AuthResponseData } from "@interfaces/auth-response.model";
import { AlertController } from "@ionic/angular";

import { AuthService } from "@services/index";
import { AngularAuthService } from "@services/login/auth/angular-auth.service";
import { SwipeStackStore, CurrentUserStore } from "@stores/index";
import { Observable } from "rxjs";

import { FishSwimAnimation, WavesSlowAnimation, WavesFastAnimation } from "@animations/index";

@Component({
  selector: "app-login",
  templateUrl: "./login.page.html",
  styleUrls: ["./login.page.scss"],
})
export class LoginPage implements OnInit {
  @ViewChild('fish', { read: ElementRef }) fish: ElementRef;

  loginForm = new FormGroup({
    email: new FormControl("", [
      Validators.email,
      Validators.required,
      // Validators.pattern("[a-zA-Z]*@[a-zA-Z]*.ac.uk"),
    ]),
    password: new FormControl("", [Validators.required]),
  });

  constructor(
    private auth: AuthService,
    private signUpAuthService: AngularAuthService,
    private router: Router,
    private alertCtrl: AlertController,
    private afAuth: AngularFireAuth,
    private currentUserStore: CurrentUserStore,
    private swipeStackStore: SwipeStackStore
  ) {}

  fishSwimAnimation;

  ngOnInit() {}

  // async signIn() {
  //   try {
  //     const email: string = this.loginForm.get("email").value;
  //     const password: string = this.loginForm.get("password").value;
  //     console.log(email, password);

  //     const signin = await this.auth.signIn(email, password);
  //     if (signin) {
  //       this.router.navigateByUrl("tabs/home");
  //     }
  //   } catch (e) {
  //     console.error("Unsuccessful sign in", e);
  //   }
  // }

  ionViewDidEnter() {
    //Initialise animations
    this.fishSwimAnimation = FishSwimAnimation(this.fish);

    //Play animations (WILL LOOP INFINITELY)
    this.fishSwimAnimation.play();
  }

  enterSubmit(event) {
    if (event.keyCode === 13) {
      this.onSubmit();
    }
  }

  onSubmit() {
    if (!this.loginForm.valid) {
      return this.showAlert("This shit ain't valid fam");
    }
    const email: string = this.loginForm.get("email").value;
    const password: string = this.loginForm.get("password").value;
    console.log(email, password);

    const auth$: Observable<AuthResponseData> = this.signUpAuthService.login(
      email,
      password
    );
    this.afAuth
      .signInWithEmailAndPassword(email, password)
      .then(() => this.router.navigateByUrl("/main/tabs/home"))
      .then(() => this.afAuth.currentUser)
      .then((user) => {
        if (user) {
          this.currentUserStore.initializeStore(user.uid);

          this.swipeStackStore.initializeStore(user.uid);
        }
      });

    // auth$.subscribe(
    //   (resData) => {
    //     // console.log(resData);
    //     this.router.navigateByUrl("/main/tabs/home");
    //   },
    //   (errRes) => {
    //     const code = errRes.error.error.message;
    //     let message = "Please check your info and try again";
    //     if (code == "EMAIL_NOT_FOUND") {
    //       message =
    //         "There is no user record corresponding to this identifier. The user may have been deleted.";
    //     }
    //     if (code == "INVALID_PASSWORD") {
    //       message = "The password is invalid or the user does not have a password.";
    //     }
    //     if (code == "USER_DISABLED") {
    //       message = "The user account has been disabled by an administrator.";
    //     }
    //     this.showAlert(message);
    //   }
    // );
  }

  ionViewWillLeave() {
    this.fishSwimAnimation.pause();
  }

  private showAlert(message: string) {
    this.alertCtrl
      .create({
        header: "Signup Failed",
        message: message,
        buttons: ["Okay"],
      })
      .then((alertEl) => alertEl.present());
  }
}
