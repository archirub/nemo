import { Component, OnInit, OnDestroy, Input } from "@angular/core";
import { ModalController } from "@ionic/angular";

import { ChatboardStore } from "@stores/index";
import { Chat } from "@classes/index";
import {
  ChatboardPicturesStore,
  pictureHolder,
} from "@stores/pictures-stores/chatboard-pictures-store/chatboard-pictures.service";
import { Observable, Subscription } from "rxjs";

@Component({
  selector: "app-matches",
  templateUrl: "./matches.component.html",
  styleUrls: ["./matches.component.scss"],
})
export class MatchesComponent implements OnInit, OnDestroy {
  chatboardPictures$: Observable<pictureHolder>;
  chatboardPicturesSub: Subscription;

  @Input() matches: Chat[];

  constructor(
    private modalCtrl: ModalController,
    private chatboardStore: ChatboardStore,
    private chatboardPicturesService: ChatboardPicturesStore // used in template
  ) {}

  ngOnInit() {
    this.chatboardPictures$ = this.chatboardPicturesService.holder$;
    this.chatboardPicturesSub = this.chatboardPicturesService
      .activateStore(this.chatboardStore.allChats$)
      .subscribe();
  }

  ngOnDestroy() {
    this.chatboardPicturesSub.unsubscribe();
  }

  async closeModal() {
    return await this.modalCtrl.dismiss();
  }
}
