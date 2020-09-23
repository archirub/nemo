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
          import("../pages/home/home.module").then((m) => m.HomePageModule),
      },
      {
        path: "chats",
        loadChildren: () =>
          import("../pages/chats/chats.module").then((m) => m.ChatsPageModule),
      },
      {
        path: "own-profile",
        loadChildren: () =>
          import("../pages/own-profile/own-profile.module").then(
            (m) => m.OwnProfilePageModule
          ),
      },
      {
        path: "**",
        redirectTo: "tabs/home",
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
