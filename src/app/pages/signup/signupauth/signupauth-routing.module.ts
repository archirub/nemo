import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { SignupauthPage } from './signupauth.page';

const routes: Routes = [
  {
    path: '',
    component: SignupauthPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SignupauthPageRoutingModule {}
