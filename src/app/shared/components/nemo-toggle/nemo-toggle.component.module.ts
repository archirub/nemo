import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { IonicModule } from "@ionic/angular";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { AppToggleComponent } from "./nemo-toggle.component";

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
  ],
  declarations: [
    AppToggleComponent
  ],
  exports: [
    AppToggleComponent
  ],
})
export class AppToggleModule {}
