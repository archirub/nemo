import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { IonicModule } from "@ionic/angular";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { AddPhotoComponent } from "./add-photo.component";
import { ImageCropperComponentModule } from "@components/image-cropper/image-cropper.component.module";

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    ImageCropperComponentModule,
  ],
  declarations: [AddPhotoComponent],
  exports: [AddPhotoComponent],
})
export class AddPhotoModule {}
