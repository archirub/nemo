import { Injectable } from "@angular/core";
import { Resolve, RouterStateSnapshot, ActivatedRouteSnapshot } from "@angular/router";

import { filter, map, mapTo, Observable, of, switchMapTo, take } from "rxjs";

import { ChatboardStore } from "@stores/index";
import { MessagesService } from "./messages.service";
import { Logger } from "src/app/shared/functions/custom-rxjs";

@Injectable({ providedIn: "root" })
export class MessagesResolver implements Resolve<boolean> {
  constructor(
    public msgService: MessagesService,
    private chatboardStore: ChatboardStore
  ) {}

  resolve(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    if (!route.paramMap.has("chatID")) return of(false);
    return this.initializeMessenger(route.paramMap.get("chatID"));
  }

  private initializeMessenger(chatid: string): Observable<true> {
    return this.chatboardStore.allChats$.pipe(
      map((chats) => chats?.[chatid]),
      Logger("chat"),
      filter((c) => !!c),
      take(1),
      Logger("aaaaa"),

      map((chat) => this.msgService.initializeChat(chat)),
      Logger("yoyo"),

      switchMapTo(this.msgService.listenToMoreMessages()),
      mapTo(true)
    );
  }
}
