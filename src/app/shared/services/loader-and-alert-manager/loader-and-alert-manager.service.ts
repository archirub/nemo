import { Injectable } from "@angular/core";
import {
  AlertController,
  AlertOptions,
  LoadingController,
  LoadingOptions,
} from "@ionic/angular";

import {
  BehaviorSubject,
  concat,
  defer,
  filter,
  first,
  firstValueFrom,
  lastValueFrom,
  map,
  Observable,
  of,
  switchMap,
  take,
  tap,
  withLatestFrom,
} from "rxjs";

// const HTMLIonLoadingElementInstance = new HTMLIonLoadingElement();
// const HTMLIonAlertElementInstance = new HTMLIonAlertElement();

type LoadingOrAlertEl = HTMLIonLoadingElement | HTMLIonAlertElement;
type ElType = "loading" | "alert" | "empty";
type DisplayStrategy = "replace" | "queue" | "replace-erase" | "queue-erase";

// The display strategies have the following meanings:
// - replace: replace the current "displayed", leave the queue unchanged
// - replace-erase: replace the current "displayed", erase the queue
// - queue-erase: erase the current queue, then queue up the element
// - queue: queue up the element, leave the queue unchanged

@Injectable({
  providedIn: "root",
})
export class LoadingAndAlertManager {
  private displayed$ = new BehaviorSubject<LoadingOrAlertEl>(null);
  private queued$ = new BehaviorSubject<LoadingOrAlertEl[]>([]);

  private defaultLoadingOptions: LoadingOptions = {
    spinner: "bubbles",
    translucent: true,
    backdropDismiss: false,
    duration: 6000,
  };

  private defaultAlertOptions: AlertOptions = {};

  constructor(
    private loadingCtrl: LoadingController,
    private alertCtrl: AlertController
  ) {}

  presentNew(element: LoadingOrAlertEl, strategy: DisplayStrategy) {
    const tasks$: Observable<any>[] = [];

    // erasing the queue must be done before queuing for "queue-erase"

    if (strategy === "queue-erase" || strategy === "replace-erase")
      tasks$.push(this.eraseQueue());

    if (strategy === "replace" || strategy === "replace-erase")
      tasks$.push(this.replaceDisplayed(element));

    if (strategy === "queue" || strategy === "queue-erase")
      tasks$.push(this.addToQueue(element));

    return lastValueFrom(concat(...tasks$));
  }

  dismissDisplayed(): Promise<any> {
    return lastValueFrom(
      this.displayed$.pipe(
        take(1),
        switchMap((el) => {
          if (!this.isElement(el)) return of("");

          return el.dismiss();
        })
      )
    );
  }

  async createAlert(opts?: AlertOptions): Promise<HTMLIonAlertElement> {
    const options = {
      ...this.defaultAlertOptions,
      ...opts,
    };
    const alert = await this.alertCtrl.create(options);

    // this is the logic that makes the next element come on from the queue when the previous fulfills.
    // This assumes the only scenario where the onDidDismiss trigger comes on is when the element
    // is or has been located in the "displayed$" Subject, has been presented, and is now being dismissed
    alert.onDidDismiss().then(() => firstValueFrom(this.nextFromQueue()));

    return alert;
  }

  async createLoading(opts?: LoadingOptions): Promise<HTMLIonLoadingElement> {
    const options = {
      ...this.defaultLoadingOptions,
      ...opts,
    };

    const loader = await this.loadingCtrl.create(options);

    // read above in "createAlert" for description
    loader.onDidDismiss().then(() => firstValueFrom(this.nextFromQueue()));

    return loader;
  }

  private replaceDisplayed(element: LoadingOrAlertEl) {
    const changeDisplayed$ = this.displayed$.pipe(
      take(1),
      switchMap(() => {
        this.displayed$.next(element);
        return element.present();
      })
    );

    return concat(
      defer(() => this.dismissDisplayed()),
      changeDisplayed$
    );
  }

  private addToQueue(element: LoadingOrAlertEl) {
    return this.queued$.pipe(
      take(1),
      map((queued) => this.queued$.next(queued.concat(element)))
    );
  }

  private eraseQueue() {
    return of(this.queued$.next([]));
  }

  private nextFromQueue() {
    const nextFromQueue$ = this.queued$.pipe(
      take(1),
      filter((els) => els.length > 0),
      map((els) => [els[0], els.slice(1)] as const),
      switchMap(([firstEl, remainingEls]) => {
        this.queued$.next(remainingEls);
        this.displayed$.next(firstEl);

        return firstEl.present();
      })
    );

    return concat(
      defer(() => this.dismissDisplayed()),
      nextFromQueue$
    );
  }

  private isElement(el: LoadingOrAlertEl): boolean {
    return !!el?.dismiss && !!el?.present;
  }
}
