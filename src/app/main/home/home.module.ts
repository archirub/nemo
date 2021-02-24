import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { IonicModule } from "@ionic/angular";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { HomePage } from "./home.page";

import { HomePageRoutingModule } from "./home-routing.module";
import { SwipeCardComponent } from "./swipe-card/swipe-card.component";
import { SearchCriteriaComponent } from "./search-criteria/search-criteria.component";
import { AppToggleComponent, ProfileCardComponent } from "@components/index";
import { ProfileCardModule } from "@components/profile-card/profile-card.component.module";

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    HomePageRoutingModule,
    ProfileCardModule
  ],
  declarations: [
    HomePage,
    SwipeCardComponent,
    SearchCriteriaComponent,
    AppToggleComponent,
  ],
  providers: [ SwipeCardComponent ],
  // Seems to make sure the search criteria modal opening is much faster on the first try
  bootstrap: [SearchCriteriaComponent],
})
export class HomePageModule {}
