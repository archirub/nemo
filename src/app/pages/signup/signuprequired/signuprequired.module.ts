import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { SignuprequiredPageRoutingModule } from './signuprequired-routing.module';

import { SignuprequiredPage } from './signuprequired.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    SignuprequiredPageRoutingModule
  ],
  declarations: [SignuprequiredPage]
})
export class SignuprequiredPageModule {}
