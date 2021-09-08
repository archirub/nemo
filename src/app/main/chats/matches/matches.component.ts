import { Component, OnInit, OnDestroy, Input } from "@angular/core";
import { ModalController } from "@ionic/angular";

import { ChatboardStore } from "@stores/index";
import { Chat } from "@classes/index";
import {
  ChatboardPicturesStore,
  pictureHolder,
} from "@stores/pictures/chatboard-pictures/chatboard-pictures.service";
import { Observable, Subscription } from "rxjs";

@Component({
  selector: "app-matches",
  templateUrl: "./matches.component.html",
  styleUrls: ["./matches.component.scss"],
})
export class MatchesComponent implements OnInit {
  chatboardPictures$: Observable<pictureHolder>;

  @Input() matches: Chat[];

  constructor(
    private modalCtrl: ModalController,
    private chatboardStore: ChatboardStore,
    private chatboardPicturesService: ChatboardPicturesStore // used in template
  ) {}

  ngOnInit() {
    this.chatboardPictures$ = this.chatboardPicturesService.holder$;
  }

  async closeModal() {
    return await this.modalCtrl.dismiss();
  }
}
