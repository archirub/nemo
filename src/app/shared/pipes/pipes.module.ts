import { NgModule } from "@angular/core";
import { IonicModule } from "@ionic/angular";
import { AgePipe } from "./age.pipe";
import { FormatSexPrefPipe } from "./format-sex-pref.pipe";

@NgModule({
  declarations: [AgePipe, FormatSexPrefPipe],
  imports: [IonicModule],
  exports: [AgePipe, FormatSexPrefPipe],
})
export class PipesModule {}
