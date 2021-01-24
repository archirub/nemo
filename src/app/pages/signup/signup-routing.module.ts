import { NgModule } from "@angular/core";
import { Routes, RouterModule } from "@angular/router";

import { SignupPage } from "./signup.page";

const routes: Routes = [
  {
    path: "",
    component: SignupPage,
  },
  {
    path: 'signupauth',
    loadChildren: () => import('./signupauth/signupauth.module').then( m => m.SignupauthPageModule)
  },
  {
    path: 'signuprequired',
    loadChildren: () => import('./signuprequired/signuprequired.module').then( m => m.SignuprequiredPageModule)
  },
  {
    path: 'signupoptional',
    loadChildren: () => import('./signupoptional/signupoptional.module').then( m => m.SignupoptionalPageModule)
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SignupPageRoutingModule {}
