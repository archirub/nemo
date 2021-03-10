import { NgModule } from "@angular/core";
import { IonicModule } from "@ionic/angular";
import { AgePipe } from "./age.pipe";

@NgModule({
  declarations: [AgePipe],
  imports: [IonicModule],
  exports: [AgePipe]
})
export class PipesModule {}