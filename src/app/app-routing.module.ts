import { NgModule } from "@angular/core";
import { PreloadAllModules, RouterModule, Routes } from "@angular/router";
import { SignupAuthGuard } from "@services/login/signup-auth.guard";
import { MainPage } from "./main/main.page";
import { WelcomePage } from "./welcome/welcome.page";

const routes: Routes = [
  {
    path: "welcome",
    loadChildren: () =>
      import("./welcome/welcome.module").then((m) => m.WelcomePageModule),
  },
  {
    path: 'main',
    loadChildren: () => import('./main/main.module').then( m => m.MainPageModule),
    canActivate: [SignupAuthGuard]
  },
  {
    path: '**',
    loadChildren: () => import('./main/main.module').then( m => m.MainPageModule),
    canActivate: [SignupAuthGuard]
  }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules }),
  ],
  exports: [RouterModule],
})
export class AppRoutingModule {}
