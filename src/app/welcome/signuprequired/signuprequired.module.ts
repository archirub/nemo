import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";

import { IonicModule } from "@ionic/angular";

import { SignuprequiredPageRoutingModule } from "./signuprequired-routing.module";

import { AddPhotoComponent } from "@components/index";
import { AddPhotoModule } from "@components/add-photo/add-photo.component.module";
import { SignuprequiredPage } from "./signuprequired.page";
import { BrowserModule } from "@angular/platform-browser";
import { PipesModule } from "@pipes/pipes.module";

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    SignuprequiredPageRoutingModule,
    AddPhotoModule,
    ReactiveFormsModule,
    PipesModule,
  ],
  declarations: [SignuprequiredPage],
})
export class SignuprequiredPageModule {}
