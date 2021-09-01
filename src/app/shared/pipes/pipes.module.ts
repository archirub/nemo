import { NgModule } from "@angular/core";
import { IonicModule } from "@ionic/angular";
import { AgePipe } from "./age.pipe";
import { FormatSexPrefPipe } from "./format-sex-pref.pipe";
import { DegreesPipe } from "./degrees.pipe";
import { SafeUrlPipe } from "./safe-url.pipe";

@NgModule({
  declarations: [AgePipe, FormatSexPrefPipe, DegreesPipe, SafeUrlPipe],
  imports: [IonicModule],
  exports: [AgePipe, FormatSexPrefPipe, DegreesPipe, SafeUrlPipe],
})
export class PipesModule {}
