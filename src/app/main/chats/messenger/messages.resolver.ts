import { Injectable } from "@angular/core";
import { Resolve, RouterStateSnapshot, ActivatedRouteSnapshot } from "@angular/router";

import { filter, map, mapTo, Observable, of, switchMapTo, take } from "rxjs";

import { ChatboardStore } from "@stores/index";
import { MessagesService } from "./messages.service";

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
    return this.chatboardStore.chats$.pipe(
      map((chats) => chats?.[chatid]),
      filter((c) => !!c),
      take(1),
      map((chat) => this.msgService.initializeChat(chat)),
      switchMapTo(this.msgService.listenToMoreMessages()),
      mapTo(true)
    );
  }
}
