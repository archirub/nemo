import { PipesModule } from "./../../shared/pipes/pipes.module";
import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";

import { IonicModule } from "@ionic/angular";

import { SettingsPageRoutingModule } from "./settings-routing.module";

import { SettingsPage } from "./settings.page";
import { AppToggleModule } from "@components/nemo-toggle/nemo-toggle.component.module";
import { PdfViewerModule } from "ng2-pdf-viewer";
import { platformBrowserDynamic } from "@angular/platform-browser-dynamic";

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    SettingsPageRoutingModule,
    AppToggleModule,
    PipesModule,
    PdfViewerModule
  ],
  declarations: [SettingsPage],
})
export class SettingsPageModule {}

//platformBrowserDynamic().bootstrapModule(SettingsPageModule);
