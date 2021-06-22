import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ProfileEditPhotoPage } from './profile-edit-photo.page';

const routes: Routes = [
  {
    path: '',
    component: ProfileEditPhotoPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ProfileEditPhotoPageRoutingModule {}
