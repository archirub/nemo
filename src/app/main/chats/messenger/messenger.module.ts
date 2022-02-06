import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";

import { IonicModule } from "@ionic/angular";

import { MessengerPageRoutingModule } from "./messenger-routing.module";
import { MessengerPage } from "./messenger.page";
import { ProfileCardModule } from "@components/profile-card/profile-card.component.module";
import { PipesModule } from "@pipes/pipes.module";
import { ReportUserComponent } from "../report-user/report-user.component";
import { ReportUserModule } from "../report-user/report-user.module";
import { InfiniteScrollModule } from "@components/infinite-scroll/infinite-scroll.component.module";
import { MessageBoardComponent } from "src/app/main/chats/messenger/message-board/message-board.component";
import { MessagesService } from "./messages.service";

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    MessengerPageRoutingModule,
    ProfileCardModule,
    PipesModule,
    ReportUserModule,
    // InfiniteScrollModule,
  ],
  declarations: [MessengerPage, MessageBoardComponent],
  providers: [MessagesService],
})
export class MessengerPageModule {}
