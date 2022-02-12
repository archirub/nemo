import { NgModule } from "@angular/core";
import { Routes, RouterModule } from "@angular/router";
import { MessagesResolver } from "./chats/messenger/messages.resolver";

import { MainPage } from "./main.page";

const routes: Routes = [
  {
    path: "",
    component: MainPage,
  },
  {
    path: "tabs",
    loadChildren: () =>
      import("./tab-menu/tab-menu.module").then((m) => m.TabMenuPageModule),
  },
  {
    path: "settings", // ^same goes for this^
    loadChildren: () =>
      import("./settings/settings.module").then((m) => m.SettingsPageModule),
  },
  {
    path: "messenger/:chatID", // this is specified outside tabs so that they aren't visible on the chats page
    loadChildren: () =>
      import("./chats/messenger/messenger.module").then((m) => m.MessengerPageModule),
    resolve: {
      messages: MessagesResolver,
    },
  },

  // {
  //   path: "**",
  //   redirectTo: "tabs/home",
  // },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class MainPageRoutingModule {}
