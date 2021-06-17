import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { IonicModule } from "@ionic/angular";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { InterestSlidesComponent } from "./interests-slides.component";

@NgModule({
  imports: [CommonModule, FormsModule, ReactiveFormsModule, IonicModule],
  declarations: [InterestSlidesComponent],
  exports: [InterestSlidesComponent],
})
export class InterestSlidesModule {}
