import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { SignuprequiredPageRoutingModule } from './signuprequired-routing.module';

import { SignuprequiredPage } from './signuprequired.page';
import { AddPhotoComponent } from '@components/index';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    SignuprequiredPageRoutingModule
  ],
  declarations: [AddPhotoComponent]
})
export class SignuprequiredPageModule {}
