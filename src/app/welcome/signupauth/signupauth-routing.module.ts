import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { SignupAuthGuard } from '@services/login/signup-auth.guard';
import { SignupoptionalPage } from '../signupoptional/signupoptional.page';
import { SignuprequiredPage } from '../signuprequired/signuprequired.page';

import { SignupauthPage } from './signupauth.page';

const routes: Routes = [
  {
    path: '',
    component: SignupauthPage
  },
  {
    path: 'signuprequired',
    component: SignuprequiredPage,
    canActivate: [SignupAuthGuard]
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SignupauthPageRoutingModule {}
