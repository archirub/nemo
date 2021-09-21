import { NgModule } from "@angular/core";
import { IonicModule } from "@ionic/angular";
import { AgePipe } from "./age.pipe";
import { FormatSexPrefPipe } from "./format-sex-pref.pipe";
import { DegreesPipe } from "./degrees.pipe";
import { SafeUrlPipe } from "./safe-url.pipe";
import { NullElementToPipe } from "./null-element-to.pipe";

@NgModule({
  declarations: [AgePipe, FormatSexPrefPipe, DegreesPipe, SafeUrlPipe, NullElementToPipe],
  imports: [IonicModule],
  exports: [AgePipe, FormatSexPrefPipe, DegreesPipe, SafeUrlPipe, NullElementToPipe],
})
export class PipesModule {}
