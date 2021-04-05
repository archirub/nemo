import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";

import { IonicModule } from "@ionic/angular";

import { SignupauthPageRoutingModule } from "./signupauth-routing.module";

import { SignupauthPage } from "./signupauth.page";

@NgModule({
  imports: [
    FormsModule,
    ReactiveFormsModule,
    CommonModule,
    IonicModule,
    SignupauthPageRoutingModule,
  ],
  declarations: [SignupauthPage],
})
export class SignupauthPageModule {}
