import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { SignupoptionalPage } from '../signupoptional/signupoptional.page';

import { SignuprequiredPage } from './signuprequired.page';

const routes: Routes = [
  {
    path: '',
    component: SignuprequiredPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SignuprequiredPageRoutingModule {}
