import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";

import { IonicModule } from "@ionic/angular";

import { SignupoptionalPageRoutingModule } from "./signupoptional-routing.module";

import { SignupoptionalPage } from "./signupoptional.page";

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    FormsModule,
    ReactiveFormsModule,
    SignupoptionalPageRoutingModule,
  ],
  declarations: [],
})
export class SignupoptionalPageModule {}
