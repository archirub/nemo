import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";

import { IonicModule } from "@ionic/angular";

import { ChatsPageRoutingModule } from "./chats-routing.module";

import { ChatsPage } from "./chats.page";
import { ChatBoardComponent } from "./chat-board/chat-board.component";
import { MatchesComponent } from "./matches/matches.component";
import { InfiniteScrollComponent } from "@components/infinite-scroll/infinite-scroll.component";

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, ChatsPageRoutingModule],
  declarations: [
    ChatsPage,
    ChatBoardComponent,
    MatchesComponent,
    InfiniteScrollComponent,
  ],
})
export class ChatsPageModule {}
