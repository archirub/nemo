import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { IonicModule } from "@ionic/angular";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { AddPhotoComponent } from "./add-photo.component";

@NgModule({
  imports: [CommonModule, FormsModule, ReactiveFormsModule, IonicModule],
  declarations: [AddPhotoComponent],
  exports: [AddPhotoComponent],
})
export class AddPhotoModule {}
