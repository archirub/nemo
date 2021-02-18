import { Component, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { AngularAuthService } from "@services/login/auth/angular-auth.service";

@Component({
  selector: "app-welcome",
  templateUrl: "./welcome.page.html",
  styleUrls: ["./welcome.page.scss"],
})
export class WelcomePage implements OnInit {
  constructor(private router: Router) {}

  ngOnInit() {}

  goToSignup() {
    this.router.navigateByUrl("welcome/signupauth");
  }

  goToLogin() {
    this.router.navigateByUrl("welcome/login");
  }
}
