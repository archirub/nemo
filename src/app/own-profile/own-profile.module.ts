import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { OwnProfilePageRoutingModule } from './own-profile-routing.module';

import { OwnProfilePage } from './own-profile.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    OwnProfilePageRoutingModule
  ],
  declarations: [OwnProfilePage]
})
export class OwnProfilePageModule {}
