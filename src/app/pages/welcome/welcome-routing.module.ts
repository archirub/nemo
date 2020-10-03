import { NgModule } from "@angular/core";
import { Routes, RouterModule } from "@angular/router";

import { WelcomePage } from "./welcome.page";

const routes: Routes = [
  {
    path: "",
    component: WelcomePage,
    // children: [
    //   {
    //     path: "signup",
    //     loadChildren: () =>
    //       import("../signup/signup.module").then((m) => m.SignupPageModule),
    //   },
    //   {
    //     path: "login",
    //     loadChildren: () =>
    //       import("../login/login.module").then((m) => m.LoginPageModule),
    //   },
    // ],
  },
  {
    path: "**",
    redirectTo: "/tabs/home",
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class WelcomePageRoutingModule {}
