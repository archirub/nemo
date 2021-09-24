import { NgModule } from "@angular/core";
import { Routes, RouterModule } from "@angular/router";
import { HomePage } from "../main/home/home.page";
import { SignupoptionalPage } from "./signupoptional/signupoptional.page";

import { WelcomePage } from "./welcome.page";

const routes: Routes = [
  {
    path: "",
    component: WelcomePage,
  },
  {
    path: "signupauth",
    loadChildren: () =>
      import("./signupauth/signupauth.module").then((m) => m.SignupauthPageModule),
  },
  {
    path: "login",
    loadChildren: () => import("./login/login.module").then((m) => m.LoginPageModule),
  },
  {
    path: "signuprequired",
    loadChildren: () =>
      import("./signuprequired/signuprequired.module").then(
        (m) => m.SignuprequiredPageModule
      ),
  },
  {
    path: "signupoptional",
    loadChildren: () =>
      import("./signupoptional/signupoptional.module").then(
        (m) => m.SignupoptionalPageModule
      ),
  },
  {
    path: 'signup-to-app',
    loadChildren: () => import('./signup-to-app/signup-to-app.module').then( m => m.SignupToAppPageModule)
  },
  // {
  //   path: '**',
  //   component: HomePage
  // }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class WelcomePageRoutingModule {}
