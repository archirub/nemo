import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { WelcomePageRoutingModule } from './welcome-routing.module';

import { WelcomePage } from './welcome.page';
import { LoginPage } from './login/login.page';
import { SignupauthPage } from './signupauth/signupauth.page';
import { SignuprequiredPage } from './signuprequired/signuprequired.page';
import { SignupoptionalPage } from './signupoptional/signupoptional.page';
import { SignupauthPageModule } from './signupauth/signupauth.module';
import { SignupauthPageRoutingModule } from './signupauth/signupauth-routing.module';
import { AddPhotoComponent, AppDatetimeComponent } from '@components/index';
import { AddPhotoModule } from '@components/add-photo/add-photo.component.module';

@NgModule({
  imports: [
    CommonModule,
    IonicModule,
    WelcomePageRoutingModule,
    SignupauthPageModule, 
    FormsModule,
    ReactiveFormsModule,
    AddPhotoModule
  ],
  declarations: [SignupauthPage, SignuprequiredPage, SignupoptionalPage, LoginPage, WelcomePage, AppDatetimeComponent]
})
export class WelcomePageModule {}
