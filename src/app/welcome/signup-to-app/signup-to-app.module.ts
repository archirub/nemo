import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { SignupToAppPageRoutingModule } from './signup-to-app-routing.module';

import { SignupToAppPage } from './signup-to-app.page';
import { AppToggleModule } from '@components/nemo-toggle/nemo-toggle.component.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AppToggleModule,
    SignupToAppPageRoutingModule
  ],
  declarations: [SignupToAppPage]
})
export class SignupToAppPageModule {}
