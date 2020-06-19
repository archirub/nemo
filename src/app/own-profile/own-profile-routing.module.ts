import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { OwnProfilePage } from './own-profile.page';

const routes: Routes = [
  {
    path: '',
    component: OwnProfilePage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class OwnProfilePageRoutingModule {}
