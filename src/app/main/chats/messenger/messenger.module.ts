import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { IonicModule } from "@ionic/angular";

import { MessengerPageRoutingModule } from "./messenger-routing.module";
import { MessengerPage } from "./messenger.page";

import { ProfileCardModule } from "@components/profile-card/profile-card.component.module";
import { PipesModule } from "@pipes/pipes.module";

import { ReportUserModule } from "../report-user/report-user.module";
import { MessageBoardComponent } from "./message-board/message-board.component";

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    MessengerPageRoutingModule,
    ProfileCardModule,
    PipesModule,
    ReportUserModule,
  ],
  declarations: [MessengerPage, MessageBoardComponent],
})
export class MessengerPageModule {}
