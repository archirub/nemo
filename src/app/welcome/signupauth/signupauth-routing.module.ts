import { NgModule } from "@angular/core";
import { Routes, RouterModule } from "@angular/router";
import { SignuprequiredPage } from "../signuprequired/signuprequired.page";

import { SignupauthPage } from "./signupauth.page";

const routes: Routes = [
  {
    path: "",
    component: SignupauthPage,
  },
  {
    path: "signuprequired",
    component: SignuprequiredPage,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SignupauthPageRoutingModule {}
