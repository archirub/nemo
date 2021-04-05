import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { IonicModule } from "@ionic/angular";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { ProfileCardComponent } from "./profile-card.component";
import { PipesModule } from "../../pipes/pipes.module";

@NgModule({
  imports: [CommonModule, FormsModule, ReactiveFormsModule, IonicModule],
  declarations: [ProfileCardComponent],
  exports: [ProfileCardComponent],
})
export class ProfileCardModule {}
