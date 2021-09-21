import { PipesModule } from "./../../shared/pipes/pipes.module";
import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";

import { IonicModule } from "@ionic/angular";

import { SettingsPageRoutingModule } from "./settings-routing.module";

import { SettingsPage } from "./settings.page";
import { AppToggleModule } from "@components/nemo-toggle/nemo-toggle.component.module";

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    SettingsPageRoutingModule,
    AppToggleModule,
    PipesModule,
  ],
  declarations: [SettingsPage],
})
export class SettingsPageModule {}
