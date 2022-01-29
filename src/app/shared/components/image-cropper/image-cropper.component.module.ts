import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { IonicModule } from "@ionic/angular";
// import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { ImageCropperComponent } from "./image-cropper.component";
import { ImageCropperModule } from "ngx-image-cropper";

@NgModule({
  imports: [CommonModule, IonicModule, ImageCropperModule],
  declarations: [ImageCropperComponent],
  exports: [ImageCropperComponent],
})
export class ImageCropperComponentModule {}
