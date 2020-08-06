import { NgModule } from "@angular/core";
import { PreloadAllModules, RouterModule, Routes } from "@angular/router";

const routes: Routes = [
  {
    path: "home",
    loadChildren: () =>
      import("./pages/home/home.module").then((m) => m.HomePageModule),
  },
  {
    path: "chats",
    loadChildren: () =>
      import("./pages/chats/chats.module").then((m) => m.ChatsPageModule),
  },
  {
    path: "own-profile",
    loadChildren: () =>
      import("./pages/own-profile/own-profile.module").then(
        (m) => m.OwnProfilePageModule
      ),
  },
  {
    path: "settings",
    loadChildren: () =>
      import("./pages/settings/settings.module").then(
        (m) => m.SettingsPageModule
      ),
  },
  // {
  //   path: "",
  //   redirectTo: "/home",
  //   pathMatch: "full",
  // },
  {
    path: "**",
    redirectTo: "/home",
  },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules }),
  ],
  exports: [RouterModule],
})
export class AppRoutingModule {}
