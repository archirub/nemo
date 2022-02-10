import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";

import { IonicModule } from "@ionic/angular";

import { SignuprequiredPageRoutingModule } from "./signuprequired-routing.module";

import { SignuprequiredPage } from "./signuprequired.page";
import { AddPhotoModule } from "@components/add-photo/add-photo.component.module";
import { AppDatetimeComponent } from "@components/index";
import { PipesModule } from "@pipes/pipes.module";
import { PrivacyModalComponent } from "./privacy-modal/privacy-modal.component";
import { TermsModalComponent } from "./terms-modal/terms-modal.component";
import { PdfViewerModule } from "ng2-pdf-viewer";

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    SignuprequiredPageRoutingModule,
    AddPhotoModule,
    ReactiveFormsModule,
    PdfViewerModule,
    PipesModule,
  ],
  declarations: [
    SignuprequiredPage, 
    AppDatetimeComponent,
    PrivacyModalComponent,
    TermsModalComponent],
})
export class SignuprequiredPageModule {}
