import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";

import { IonicModule } from "@ionic/angular";

import { OwnProfilePageRoutingModule } from "./own-profile-routing.module";

import { OwnProfilePage } from "./own-profile.page";
import { ProfileCardModule } from "@components/profile-card/profile-card.component.module";
import { AddPhotoModule } from "@components/add-photo/add-photo.component.module";
import { AppToggleModule } from "@components/nemo-toggle/nemo-toggle.component.module";
import { PipesModule } from "../../shared/pipes/pipes.module";
import { ProfileAnswerComponent } from "./profile-answer/profile-answer.component";
import { ProfileCourseComponent } from "./profile-course/profile-course.component";
import { InterestSlidesComponent, ProfileEditPhotoPage } from "@components/index";
import { InterestSlidesModule } from "@components/interests-slides/interests-slides.component.module";
import { ProfileEditPhotoPageModule } from "@components/profile-edit-photo/profile-edit-photo.module";

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    FormsModule,
    ReactiveFormsModule,
    OwnProfilePageRoutingModule,
    ProfileCardModule,
    AddPhotoModule,
    AppToggleModule,
    InterestSlidesModule,
    PipesModule,
    ProfileEditPhotoPageModule,
  ],
  declarations: [OwnProfilePage, ProfileAnswerComponent, ProfileCourseComponent],
})
export class OwnProfilePageModule {}
