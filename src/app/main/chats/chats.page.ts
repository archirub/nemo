import { Component, ElementRef, OnDestroy, ViewChild } from "@angular/core";
import { Animation } from "@ionic/angular";

import { BehaviorSubject, ReplaySubject, Subscription } from "rxjs";
import { delay, first, map, switchMap } from "rxjs/operators";

import { ChatboardStore } from "@stores/index";

import { Chat } from "@classes/index";
import { FishSwimAnimation } from "@animations/fish.animation";
import { TutorialsService } from "@services/tutorials/tutorials.service";

@Component({
  selector: "app-chats",
  templateUrl: "./chats.page.html",
  styleUrls: ["./chats.page.scss"],
})
export class ChatsPage implements OnDestroy {
  TOP_SCROLL_SPEED = 100;
  fishSwimAnimation: Animation;

  private subs = new Subscription();

  private fishRef$ = new ReplaySubject<ElementRef>(1);
  @ViewChild("fish", { read: ElementRef }) set fishRefSetter(ref: ElementRef) {
    if (ref) this.fishRef$.next(ref);
  }

  showLoading$ = new BehaviorSubject<boolean>(true);

  chats$ = this.chatboardStore.chats$.pipe(
    map((chatsObject) => this.sortChats(chatsObject))
  );

  matches$ = this.chatboardStore.matches$.pipe(
    map((chatsObject) => this.sortChats(chatsObject))
  );

  numberOfChats$ = this.chats$.pipe(map((chats) => chats.length));

  displayTutorial$ = this.tutorials.displayTutorial("chatBoard");

  playLoadingAnimation$ = this.fishRef$.pipe(
    first(),
    switchMap((ref) => {
      this.fishSwimAnimation = FishSwimAnimation(ref);
      return this.fishSwimAnimation.play();
    })
  );

  // this logic is to avoid the scenario where fishRef$ only gets a value after
  // we tried stopping the animation, and that it therefore just tries playing unstoppably due to playLoadingAnimation$
  stopLoadingAnimation$ = this.fishRef$.pipe(
    first(),
    delay(200), // the delay is to make sure we are calling that after playLoadingAnimation$ logic has played out in the case of the scenario explained above
    map(() => this.fishSwimAnimation?.destroy())
  );

  constructor(
    private chatboardStore: ChatboardStore,
    private tutorials: TutorialsService
  ) {}

  ngAfterViewInit() {
    this.subs.add(this.playLoadingAnimation$.subscribe());
  }

  onChatboardReady() {
    this.showLoading$.next(false);
    this.subs.add(this.stopLoadingAnimation$.subscribe());
  }

  private sortChats(chats: { [chatID: string]: Chat }): Chat[] {
    return Object.values(chats).sort(
      (chat1, chat2) =>
        chat2?.recentMessage?.time?.getTime() - chat1?.recentMessage?.time?.getTime()
    );
  }

  //TUTORIAL EXIT
  onExitTutorial() {
    //this.tutorials.markAsSeen("chatBoard").subscribe();
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }
}
