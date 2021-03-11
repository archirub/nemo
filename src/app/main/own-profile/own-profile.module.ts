import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";

import { IonicModule } from "@ionic/angular";

import { OwnProfilePageRoutingModule } from "./own-profile-routing.module";

import { OwnProfilePage } from "./own-profile.page";
import { ProfileCardModule } from "@components/profile-card/profile-card.component.module";
import { AddPhotoModule } from "@components/add-photo/add-photo.component.module";
import { AppToggleModule } from "@components/nemo-toggle/nemo-toggle.component.module";
<<<<<<< HEAD
import { ProfileAnswerComponent, ProfileCourseComponent } from "@components/index";
=======
import { PipesModule } from '../../shared/pipes/pipes.module'
>>>>>>> 6d4899c3dcf4e9cefed7bfb22eaeee9cbe3e81bf


@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ProfileCardModule,
    OwnProfilePageRoutingModule,
    ProfileCardModule,
    AddPhotoModule,
    AppToggleModule,
    PipesModule
  ],
  declarations: [OwnProfilePage, ProfileAnswerComponent, ProfileCourseComponent],
})
export class OwnProfilePageModule {}
