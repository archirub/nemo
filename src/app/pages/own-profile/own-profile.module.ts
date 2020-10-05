import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";

import { IonicModule } from "@ionic/angular";

import { OwnProfilePageRoutingModule } from "./own-profile-routing.module";

import { OwnProfilePage } from "./own-profile.page";
import { SwipeCardComponent } from "../home/swipe-card/swipe-card.component";
import { ProfileCardComponent } from "../profile-card/profile-card.component";

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    OwnProfilePageRoutingModule,
  ],
  declarations: [OwnProfilePage, ProfileCardComponent],
})
export class OwnProfilePageModule {}
