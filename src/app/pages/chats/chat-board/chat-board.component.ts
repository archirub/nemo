import { Component, Input } from "@angular/core";
import { Router } from "@angular/router";

import { Chat } from "@classes/index";

@Component({
  selector: "app-chat-board",
  templateUrl: "./chat-board.component.html",
  styleUrls: ["./chat-board.component.scss"],
})
export class ChatBoardComponent {
  @Input() chats: Chat[];

  constructor(private router: Router) {}

  goToMessenger(chatID: string) {
    this.router.navigate(["/messenger/" + chatID]);
  }
}
