import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { IonicModule } from "@ionic/angular";

import { ReportUserComponent } from "./report-user.component";

@NgModule({
  imports: [CommonModule, IonicModule],
  declarations: [ReportUserComponent],
  exports: [ReportUserComponent],
})
export class ReportUserModule {}
