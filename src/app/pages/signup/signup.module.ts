import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";

import { IonicModule } from "@ionic/angular";

import { SignupPageRoutingModule } from "./signup-routing.module";

import { SignupPage } from "./signup.page";
import { SignupauthPage } from "./signupauth/signupauth.page";
import { SignupoptionalPage } from "./signupoptional/signupoptional.page";
import { SignuprequiredPage } from "./signuprequired/signuprequired.page";

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    SignupPageRoutingModule,
    ReactiveFormsModule,
  ],
  declarations: [SignupPage, SignupauthPage, SignupoptionalPage, SignuprequiredPage],
})
export class SignupPageModule {}
