import {
  Component,
  ElementRef,
  EventEmitter,
  OnDestroy,
  Renderer2,
  ViewChild,
} from "@angular/core";
import { IonTabs } from "@ionic/angular";

import { combineLatest, filter, map, startWith, Subscription } from "rxjs";

import { TutorialsStore } from "@stores/tutorials/tutorials.service";
import { TabElementRefService } from "./tab-element-ref.service";
import { ChatboardStore } from "@stores/index";
import { Chat } from "@classes/chat.class";
import { pageTransition } from "@animations/page-transition.animation";

@Component({
  selector: "app-tab-menu",
  templateUrl: "./tab-menu.page.html",
  styleUrls: ["./tab-menu.page.scss"],
})
export class TabMenuPage implements OnDestroy {
  @ViewChild("tabs") tabs: IonTabs;
  @ViewChild("tabs", { read: ElementRef }) tabsContainer: ElementRef;

  private subs = new Subscription();

  // template emits to this when tabs change
  tabChanged$ = new EventEmitter<any>();

  unreadChats: Chat[];
  matches: Chat[];

  chats$ = this.chatboardStore.chats$.pipe(
    map((chatsObject) => {
      this.unreadChats = this.sortUnreadChats(chatsObject);
    })
  );

  matches$ = this.chatboardStore.matches$.pipe(
    map((chatsObject) => {
      this.matches = Array.from(Object.values(chatsObject));
    })
  );

  // subscribed in template to show/hide tabs
  showTab$ = combineLatest([this.tabChanged$, this.tutorials.hasSeenTutorial$]).pipe(
    filter(([_, hst]) => !!this.tabs && !!hst),
    map(([_, hst]) => [this.tabs.getSelected(), hst] as const),
    map(([tabName, hst]) => {
      //if (tabName == "own-profile") return hst.ownProfile;
      if (tabName == "home") return hst.home;
      //if (tabName == "chats") return hst.chatBoard;
      return true;
    }),
    startWith(true)
  );

  manageIconColoring$ = this.tabChanged$.pipe(
    filter(() => !!this.tabs),
    map(() => this.tabs.getSelected()),
    map((tabName) => {
      const prev = document.getElementsByClassName("fillColor"); //Remove class from previous tab
      Array.from(prev).forEach((el) => this.renderer.removeClass(el, "fillColor"));

      const target = document.getElementById(tabName);
      this.renderer.addClass(target, "fillColor"); //Class is a filter that very closely approximates primary color
    })
  );

  constructor(
    private renderer: Renderer2,
    private tutorials: TutorialsStore,
    private tabElementRef: TabElementRefService,
    private chatboardStore: ChatboardStore
  ) {
    this.subs.add(this.manageIconColoring$.subscribe());
  }

  /** Build array of chats that are unread (last message not from current user)
   * 1. unwrap chats sub object
   * 2. filter for last sender ID not being recipient ID
   **/
  private sortUnreadChats(chats: { [chatID: string]: Chat }): Chat[] {
    let incomingChats = Array.from(Object.values(chats));
    let unreadChats = incomingChats.filter(
      (c) => c.recentMessage?.senderID === c.recipient?.uid
    );

    return unreadChats;
  }

  ngOnInit() {
    this.subs.add(this.chats$.subscribe());
    this.subs.add(this.matches$.subscribe());
  }

  ngAfterViewInit() {
    this.tabElementRef.tabsRef = this.tabsContainer;
    this.tabElementRef.tabs = this.tabs;
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }
}
