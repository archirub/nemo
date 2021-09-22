import { NgModule } from "@angular/core";
import { PreloadAllModules, RouterModule, Routes } from "@angular/router";
import { AppComponent } from "./app.component";
import { MainPage } from "./main/main.page";
import { WelcomePage } from "./welcome/welcome.page";

const routes: Routes = [
  {
    path: "main",
    loadChildren: () => import("./main/main.module").then((m) => m.MainPageModule),
  },
  {
    path: "welcome/signuprequired",
    loadChildren: () =>
      import("./welcome/signuprequired/signuprequired.module").then(
        (m) => m.SignuprequiredPageModule
      ),
  },
  {
    path: "welcome",
    loadChildren: () =>
      import("./welcome/welcome.module").then((m) => m.WelcomePageModule),
  },
  {
    path: "**",
    loadChildren: () =>
      import("./welcome/welcome.module").then((m) => m.WelcomePageModule),
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })],
  exports: [RouterModule],
})
export class AppRoutingModule {}
