import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";

import { IonicModule } from "@ionic/angular";

import { OwnProfilePageRoutingModule } from "./own-profile-routing.module";

import { OwnProfilePage } from "./own-profile.page";
import { ProfileCardModule } from "@components/profile-card/profile-card.component.module";
import { AddPhotoModule } from "@components/add-photo/add-photo.component.module";
import { AppToggleModule } from "@components/nemo-toggle/nemo-toggle.component.module";


@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    OwnProfilePageRoutingModule,
    ProfileCardModule,
    AddPhotoModule,
    AppToggleModule
  ],
  declarations: [OwnProfilePage],
})
export class OwnProfilePageModule {}
