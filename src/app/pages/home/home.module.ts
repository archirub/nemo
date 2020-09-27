import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { IonicModule } from "@ionic/angular";
import { FormsModule } from "@angular/forms";
import { HomePage } from "./home.page";

import { HomePageRoutingModule } from "./home-routing.module";
import { SwipeCardComponent } from "./swipe-card/swipe-card.component";
import { SearchCriteriaComponent } from "./search-criteria/search-criteria.component";

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, HomePageRoutingModule],
  declarations: [HomePage, SwipeCardComponent, SearchCriteriaComponent],
})
export class HomePageModule {}
