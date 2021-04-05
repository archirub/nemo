import { Component, OnInit } from "@angular/core";
import { FormControl, FormGroup, Validators } from "@angular/forms";
import { Router } from "@angular/router";
import { AuthResponseData } from "@interfaces/auth-response.model";
import { AlertController } from "@ionic/angular";

import { AuthService } from "@services/index";
import { AngularAuthService } from "@services/login/auth/angular-auth.service";
import { Observable } from "rxjs";

@Component({
  selector: "app-login",
  templateUrl: "./login.page.html",
  styleUrls: ["./login.page.scss"],
})
export class LoginPage implements OnInit {
  loginForm = new FormGroup({
    email: new FormControl("", [
      Validators.email,
      Validators.required,
      // Validators.pattern("[a-zA-Z]*@[a-zA-Z]*.ac.uk"),
    ]),
    password: new FormControl("", [Validators.minLength(8), Validators.required]),
  });

  constructor(
    private auth: AuthService,
    private signUpAuthService: AngularAuthService,
    private router: Router,
    private alertCtrl: AlertController
  ) {}

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

  onSubmit() {
    // console.log("Submitted form");
    if (!this.loginForm.valid) {
      // console.log("Form is not valid");
      return;
    }
    let authObs: Observable<AuthResponseData>;
    const email: string = this.loginForm.get("email").value;
    const password: string = this.loginForm.get("password").value;
    // console.log(email, password);

    authObs = this.signUpAuthService.login(email, password);

    authObs.subscribe(
      (resData) => {
        // console.log(resData);
        this.router.navigateByUrl("/main/tabs/home");
      },
      (errRes) => {
        const code = errRes.error.error.message;
        let message = "Please check your info and try again";
        if (code == "EMAIL_NOT_FOUND") {
          let message =
            "There is no user record corresponding to this identifier. The user may have been deleted.";
        }
        if (code == "INVALID_PASSWORD") {
          let message = "The password is invalid or the user does not have a password.";
        }
        if (code == "USER_DISABLED") {
          let message = "The user account has been disabled by an administrator.";
        }
        this.showAlert(message);
      }
    );
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
