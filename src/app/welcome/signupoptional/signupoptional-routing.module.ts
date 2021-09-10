import { NgModule } from "@angular/core";
import { Routes, RouterModule } from "@angular/router";

import { SignupoptionalPage } from "./signupoptional.page";

const routes: Routes = [
  {
    path: "",
    component: SignupoptionalPage,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SignupoptionalPageRoutingModule {}
