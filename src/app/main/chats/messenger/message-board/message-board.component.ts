import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from "@angular/core";
import { IonInfiniteScroll } from "@ionic/angular";

import {
  combineLatest,
  exhaustMap,
  filter,
  firstValueFrom,
  map,
  ReplaySubject,
  Subject,
  Subscription,
  switchMap,
  switchMapTo,
  take,
  tap,
  withLatestFrom,
} from "rxjs";

import { MessagesService, MSG_BATCH_SIZE } from "../messages.service";

import { Message } from "@classes/index";
import { SubscribeAndLog } from "src/app/shared/functions/custom-rxjs";
import { wait } from "src/app/shared/functions/common";
import { MessagesResolver } from "../messages.resolver";

@Component({
  selector: "app-message-board",
  templateUrl: "./message-board.component.html",
  styleUrls: ["./message-board.component.scss"],
  providers: [
    // {
    //   provide: MessagesService,
    //   // useClass: MessagesService,
    //   useFactory: (messageResolver: MessagesResolver) => messageResolver.msgService,
    //   deps: [MessagesResolver],
    // },
  ],
})
export class MessageBoardComponent implements OnInit, OnDestroy {
  messages$ = this.msgService.messages$;
  chat$ = this.msgService.chat$;
  triggerAllLoadedPrompt$ = new Subject<true>();

  private allLoaded$ = this.msgService.allLoaded$;
  private firstBatchArrived$ = this.msgService.firstBatchArrived$;
  private subs = new Subscription();

  private infiniteScrollRef$ = new ReplaySubject<IonInfiniteScroll>(1);
  @ViewChild(IonInfiniteScroll) set infiniteScrollSetter(ref: IonInfiniteScroll) {
    if (ref) this.infiniteScrollRef$.next(ref);
  }

  private allLoadedPromptRef$ = new ReplaySubject<ElementRef>(1);
  @ViewChild("allLoadedPrompt", { read: ElementRef }) set allLoadedPromptSetter(
    ref: ElementRef
  ) {
    if (ref) this.allLoadedPromptRef$.next(ref);
  }

  constructor(private msgService: MessagesService) {
    SubscribeAndLog(this.messages$, "messages$ arrived in msg board");
  }

  manageAllLoadedPromptAnimation$ = this.triggerAllLoadedPrompt$.pipe(
    switchMapTo(this.allLoadedPromptRef$),
    exhaustMap((ref) => AllLoadedAnimation(ref))
  );

  ngOnInit() {
    // this.manageInfiniteScroll();
    this.subs.add(this.manageInfiniteScroll$.subscribe());
    SubscribeAndLog(this.allLoaded$, "allMessagesLoaded$");
    SubscribeAndLog(this.triggerAllLoadedPrompt$, "triggerAllLoadedPrompt$");
  }

  private firstBatchListenerForScroll$ = this.firstBatchArrived$.pipe(
    filter(Boolean),
    switchMapTo(
      combineLatest([
        this.infiniteScrollRef$,
        this.messages$.pipe(map((msgs) => msgs.length)),
      ])
    ),
    take(1),
    // if the number of messages after the first batch are lower than the batch size,
    // then we assume that this means all of the messages have been fetched, and
    // we hence want to disable the infinite scroll
    tap(([ref, msgCount]) => (ref.disabled = msgCount < MSG_BATCH_SIZE))
  );

  private allLoadedListenerForScroll$ = this.allLoaded$.pipe(
    filter(Boolean),
    switchMapTo(this.infiniteScrollRef$),
    take(1),
    tap((ref) => {
      ref.disabled = true;
      this.triggerAllLoadedPrompt$.next(true);
    })
  );

  private manageInfiniteScroll$ = combineLatest([
    this.firstBatchListenerForScroll$,
    this.allLoadedListenerForScroll$,
  ]);

  // async manageInfiniteScroll() {
  //   const infiniteScrollRef = await firstValueFrom(this.infiniteScrollRef$);
  //   // waits at least for first batch to arrive before
  //   await this.returnOnFirstBatchArrived();
  //   // waits for additional 2 seconds this is only to leave it time to scroll down
  //   await wait(200);
  //   // only then disables the infinite scroll
  //   infiniteScrollRef.disabled = false;
  // }

  // async returnOnFirstBatchArrived() {
  //   return firstValueFrom(this.firstBatchArrived$.pipe(filter((fba) => fba === true)));
  // }

  // used in template in ionInfiniteScroll
  async loadMoreMessages(event) {
    console.log("loadMoreMessages");
    await firstValueFrom(this.msgService.listenToMoreMessages());
    event.target.complete();
  }

  // for trackBy of ngFor on messages
  trackMessage(index: number, message: Message) {
    return message.messageID;
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }
}
import { AnimationController } from "@ionic/angular";

const AllLoadedAnimation = (allLoadedPromptRef: ElementRef<any>) => {
  const appearEasing = "cubic-bezier(0.5, 1, 0.89, 1)";
  const appearDuration = 400;

  const disappearEasing = "cubic-bezier(0.5, 0, 0.75, 0)";
  const disappearDuration = 600;

  const appearAnimation = new AnimationController()
    .create("appearAnimation")
    .addElement(allLoadedPromptRef.nativeElement)
    .easing(appearEasing)
    .duration(appearDuration)
    .beforeStyles({
      display: "flex",
    })
    .fromTo("opacity", "0", "1");

  const disappearAnimation = new AnimationController().create("disappearAnimation");

  disappearAnimation
    .addElement(allLoadedPromptRef.nativeElement)
    .easing(disappearEasing)
    .duration(disappearDuration)
    .fromTo("opacity", "1", "0")
    .afterStyles({
      display: "none",
    });

  const playAnimation = async () => {
    await appearAnimation.play();
    await wait(500);
    await disappearAnimation.play();
  };

  return playAnimation();
};
