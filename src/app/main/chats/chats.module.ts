import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";

import { IonicModule } from "@ionic/angular";

import { ChatsPageRoutingModule } from "./chats-routing.module";

import { ChatsPage } from "./chats.page";
import { ChatBoardComponent } from "./chat-board/chat-board.component";
import { MatchesComponent } from "./matches/matches.component";
import { ReportUserModule } from "./report-user/report-user.module";
import { AppToggleModule } from "@components/nemo-toggle/nemo-toggle.component.module";
import { ChatsTutorialComponent } from "@components/tutorials/chats-tutorial/chats-tutorial.component";
// import { InfiniteScrollModule } from "@components/infinite-scroll/infinite-scroll.component.module";

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ChatsPageRoutingModule,
    ReportUserModule,
    AppToggleModule,
    // InfiniteScrollModule,
  ],
  declarations: [ChatsPage, ChatBoardComponent, MatchesComponent, ChatsTutorialComponent],
})
export class ChatsPageModule {}
