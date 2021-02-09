import { Component, OnInit, OnDestroy, Input } from "@angular/core";
import { ModalController } from "@ionic/angular";

import { Observable, Subscription } from "rxjs";

import { ChatStore } from "@stores/index";
import { Chat } from "@classes/index";

@Component({
    selector: "app-matches",
    templateUrl: "./matches.component.html",
    styleUrls: ["./matches.component.scss"],
})

export class MatchesComponent implements OnInit, OnDestroy {
    @Input() chats: Chat[];

    constructor(
        private modalCtrl: ModalController,
        private chatStore: ChatStore) {}

    ngOnInit() {}

    ngOnDestroy() {}

    async closeModal() {
        return await this.modalCtrl.dismiss();
    }
}

