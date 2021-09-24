import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { SignupToAppPage } from './signup-to-app.page';

const routes: Routes = [
  {
    path: '',
    component: SignupToAppPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SignupToAppPageRoutingModule {}
