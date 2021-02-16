import { NgModule } from "@angular/core";
import { Routes, RouterModule } from "@angular/router";
import { SignupAuthGuard } from "@services/login/signup-auth.guard";
import { SignupoptionalPage } from "./signupoptional/signupoptional.page";

import { WelcomePage } from "./welcome.page";

const routes: Routes = [
  {
    path: "",
    component: WelcomePage,
  },
  {
    path: 'signupauth',
    loadChildren: () => import('./signupauth/signupauth.module').then( m => m.SignupauthPageModule)
  },
  {
    path: 'login',
    loadChildren: () => import('./login/login.module').then( m => m.LoginPageModule)
  },
  {
    path: 'signupoptional',
    loadChildren: () => import('./signupoptional/signupoptional.module').then( m => m.SignupoptionalPageModule)
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class WelcomePageRoutingModule {}
