import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { IonicModule } from "@ionic/angular";
import { InfiniteScrollComponent } from "./infinite-scroll.component";

@NgModule({
  imports: [CommonModule, IonicModule],
  declarations: [InfiniteScrollComponent],
  exports: [InfiniteScrollComponent],
})
export class InfiniteScrollModule {}
