// USELESS COMPONENT, CAN BE DELETED (as of November 10th 2021)
// REPLACED BY TOGGLE BETWEEN MATCHES AND CATCHES

import { Component, OnInit, Input } from "@angular/core";
import { ModalController, NavController } from "@ionic/angular";

import { Chat } from "@classes/index";
import {
  ChatboardPicturesStore,
  pictureHolder,
} from "@stores/pictures/chatboard-pictures/chatboard-pictures.service";
import { Observable } from "rxjs";

@Component({
  selector: "app-matches",
  templateUrl: "./matches.component.html",
  styleUrls: ["./matches.component.scss"],
})
export class MatchesComponent implements OnInit {
  chatboardPictures$: Observable<pictureHolder>;

  @Input() chats: Chat[];

  constructor(
    private modalCtrl: ModalController,
    private chatboardPicturesService: ChatboardPicturesStore, // used in template
    private navCtrl: NavController
  ) {}

  ngOnInit() {
    this.chatboardPictures$ = this.chatboardPicturesService.holder$;
  }

  // for moving to the messenger
  async goToMessenger(chatID: String) {
    await this.modalCtrl.dismiss();
    return this.navCtrl.navigateForward("main/messenger/" + chatID);
  }

  trackChat(index: number, chat: Chat) {
    return chat.id;
  }
}
