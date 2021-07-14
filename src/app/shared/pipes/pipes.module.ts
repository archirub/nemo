import { NgModule } from "@angular/core";
import { IonicModule } from "@ionic/angular";
import { AgePipe } from "./age.pipe";
import { FormatSexPrefPipe } from "./format-sex-pref.pipe";
import { DegreesPipe } from "./degrees.pipe";

@NgModule({
  declarations: [AgePipe, FormatSexPrefPipe, DegreesPipe],
  imports: [IonicModule],
  exports: [AgePipe, FormatSexPrefPipe, DegreesPipe],
})
export class PipesModule {}
