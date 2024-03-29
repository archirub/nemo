import { NgModule } from "@angular/core";
import { Routes, RouterModule } from "@angular/router";
import { HomePage } from "../../main/home/home.page";

import { LoginPage } from "./login.page";

const routes: Routes = [
  {
    path: "",
    component: LoginPage,
  },
  {
    path: "../../../main/tabs/home",
    component: HomePage,
    // canLoad: [SignupAuthGuard]
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class LoginPageRoutingModule {}
