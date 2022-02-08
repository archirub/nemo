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

import { InterestSlidesModule } from "@components/interests-slides/interests-slides.component.module";
import { InterestsModalComponent } from "./interests-modal/interests-modal.component";
import { SortablejsModule } from "ngx-sortablejs";
import { OwnProfileTutorialComponent } from "@components/tutorials/own-profile-tutorial/own-profile-tutorial.component";
import { SaveCancelComponentModule } from "../../shared/components/save-cancel/save-cancel.component.module";

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
    SortablejsModule,
    SaveCancelComponentModule,
  ],
  declarations: [
    OwnProfilePage,
    ProfileAnswerComponent,
    ProfileCourseComponent,
    InterestsModalComponent,
    OwnProfileTutorialComponent,
  ],
})
export class OwnProfilePageModule {}
