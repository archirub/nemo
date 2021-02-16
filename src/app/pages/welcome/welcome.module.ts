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

@NgModule({
  imports: [
    CommonModule,
    IonicModule,
    WelcomePageRoutingModule,
    SignupauthPageModule, 
    FormsModule,
    ReactiveFormsModule,
  ],
  declarations: [SignupauthPage, SignuprequiredPage, SignupoptionalPage, LoginPage, WelcomePage]
})
export class WelcomePageModule {}
