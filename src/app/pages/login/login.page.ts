import { Component, OnInit } from "@angular/core";
import { FormControl, FormGroup } from "@angular/forms";
import { Router } from "@angular/router";

import { AuthService } from "@services/index";

@Component({
  selector: "app-login",
  templateUrl: "./login.page.html",
  styleUrls: ["./login.page.scss"],
})
export class LoginPage implements OnInit {
  loginForm = new FormGroup({
    email: new FormControl(null),
    password: new FormControl(null),
  });

  constructor(private auth: AuthService, private router: Router) {}

  ngOnInit() {}

  async signIn() {
    try {
      const email: string = this.loginForm.get("email").value;
      const password: string = this.loginForm.get("password").value;
      console.log(email, password);

      const signin = await this.auth.signIn(email, password);
      if (signin) {
        this.router.navigateByUrl("tabs/home");
      }
    } catch (e) {
      console.error("Unsuccessful sign in", e);
    }
  }
}
