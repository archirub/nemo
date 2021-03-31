import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { SignuprequiredPageRoutingModule } from './signuprequired-routing.module';

import { SignuprequiredPage } from './signuprequired.page';
import { AddPhotoModule } from '@components/add-photo/add-photo.component.module';
import { AddPhotoComponent, AppDatetimeComponent } from '@components/index';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    SignuprequiredPageRoutingModule,
    AddPhotoModule,
  ],
  declarations: [SignuprequiredPage, AppDatetimeComponent]
})
export class SignuprequiredPageModule {}
