import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { IonicModule } from "@ionic/angular";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { QuestionSlidesComponent } from "./question-slides.component";

@NgModule({
  imports: [CommonModule, FormsModule, ReactiveFormsModule, IonicModule],
  declarations: [QuestionSlidesComponent],
  exports: [QuestionSlidesComponent],
})
export class QuestionSlidesModule {}
