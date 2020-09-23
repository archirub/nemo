import { NgModule } from "@angular/core";
import { PreloadAllModules, RouterModule, Routes } from "@angular/router";
import { MessengerPage } from './pages/chats/messenger/messenger.page';

const routes: Routes = [
  {
    path: "tabs",
    loadChildren: () =>
      import("./tab-menu/tab-menu.module").then(
        (m) => m.TabMenuPageModule),
  },
  {
    path: "tabs/chats/messenger/:profileId", // this is specified outside tabs so that they aren't visible on the chats page
    component: MessengerPage
  },
  {
    path: "settings", // ^same goes for this^
    loadChildren: () =>
      import("./pages/settings/settings.module").then(
        (m) => m.SettingsPageModule
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
