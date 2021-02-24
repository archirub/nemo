import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";

import { IonicModule } from "@ionic/angular";

import { OwnProfilePageRoutingModule } from "./own-profile-routing.module";

import { OwnProfilePage } from "./own-profile.page";
import { AddPhotoComponent, AppToggleComponent } from "@components/index";
import { ProfileCardModule } from "@components/profile-card/profile-card.component.module";

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ProfileCardModule,
    OwnProfilePageRoutingModule,
  ],
  declarations: [OwnProfilePage, AddPhotoComponent, AppToggleComponent],
})
export class OwnProfilePageModule {}
