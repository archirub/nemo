import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { SignupToAppPageRoutingModule } from './signup-to-app-routing.module';

import { SignupToAppPage } from './signup-to-app.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    SignupToAppPageRoutingModule
  ],
  declarations: [SignupToAppPage]
})
export class SignupToAppPageModule {}
