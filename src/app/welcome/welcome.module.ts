import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";

import { IonicModule } from "@ionic/angular";

import { WelcomePageRoutingModule } from "./welcome-routing.module";
import { WelcomePage } from "./welcome.page";
import { SignupauthPageModule } from "./signupauth/signupauth.module";

@NgModule({
  imports: [CommonModule, IonicModule, WelcomePageRoutingModule, SignupauthPageModule],
  declarations: [WelcomePage],
})
export class WelcomePageModule {}
