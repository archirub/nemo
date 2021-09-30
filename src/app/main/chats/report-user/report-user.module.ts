import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { IonicModule } from "@ionic/angular";

import { ReportUserComponent } from "./report-user.component";

@NgModule({
  imports: [CommonModule, IonicModule, FormsModule],
  declarations: [ReportUserComponent],
  exports: [ReportUserComponent],
})
export class ReportUserModule {}
