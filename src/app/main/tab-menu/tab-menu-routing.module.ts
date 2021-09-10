import { NgModule } from "@angular/core";
import { Routes, RouterModule } from "@angular/router";

import { TabMenuPage } from "./tab-menu.page";

const routes: Routes = [
  {
    path: "",
    component: TabMenuPage,
    children: [
      {
        path: "home",
        loadChildren: () =>
          import("../../main/home/home.module").then((m) => m.HomePageModule),
      },
      {
        path: "chats",
        loadChildren: () =>
          import("../chats/chats.module").then((m) => m.ChatsPageModule),
      },
      {
        path: "own-profile",
        loadChildren: () =>
          import("../../main/own-profile/own-profile.module").then(
            (m) => m.OwnProfilePageModule
          ),
      },
    ],
  },
  {
    path: "**",
    redirectTo: "tabs/home",
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TabMenuPageRoutingModule {}
