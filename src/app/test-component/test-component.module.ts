import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";

import { IonicModule } from "@ionic/angular";

import { TestComponentPage } from "./test-component.page";
import { SwiperModule } from "swiper/angular";

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, SwiperModule],
  declarations: [TestComponentPage],
})
export class TestComponentPageModule {}
