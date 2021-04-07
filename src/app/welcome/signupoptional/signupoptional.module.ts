import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";

import { IonicModule } from "@ionic/angular";

import { SignupoptionalPageRoutingModule } from "./signupoptional-routing.module";

import { SignupoptionalPage } from "./signupoptional.page";
import { InterestSlidesComponent } from "@components/index";
import { InterestSlidesModule } from "@components/interest-slides/interest-slides.component.module";

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    FormsModule,
    ReactiveFormsModule,
    SignupoptionalPageRoutingModule,
    InterestSlidesModule
  ],
  declarations: [SignupoptionalPage],
})
export class SignupoptionalPageModule {}
