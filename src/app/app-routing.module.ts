import { NgModule } from "@angular/core";
import { PreloadAllModules, RouterModule, Routes } from "@angular/router";

const routes: Routes = [
  {
    path: "welcome",
    loadChildren: () =>
      import("./pages/welcome/welcome.module").then((m) => m.WelcomePageModule),
  },
  {
    path: "tabs",
    loadChildren: () =>
      import("./tab-menu/tab-menu.module").then((m) => m.TabMenuPageModule),
  },
  {
    path: "settings", // ^same goes for this^
    loadChildren: () =>
      import("./pages/settings/settings.module").then(
        (m) => m.SettingsPageModule
      ),
  },
  {
    path: "messenger/:chatID", // this is specified outside tabs so that they aren't visible on the chats page
    loadChildren: () =>
      import("./pages/chats/messenger/messenger.module").then(
        (m) => m.MessengerPageModule
      ),
  },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules }),
  ],
  exports: [RouterModule],
})
export class AppRoutingModule {}
