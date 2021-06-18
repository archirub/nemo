import { Injectable } from "@angular/core";
import { LoadingController } from "@ionic/angular";

@Injectable({
  providedIn: "root",
})
export class LoadingService {
  constructor(public loadingController: LoadingController) {}

  /**
   * Presents a loader until the promises in "events" complete (in series),
   * then dismisses the loader and runs the promises in "onDismissEvents"
   * @param events list of promises to complete while loader is spinning
   * @param onDismissEvents list of promises to complete after loader is dismissed
   * @param message message displayedp
   */
  async presentLoader(
    events: Array<{ promise: (...args: any[]) => Promise<any>; arguments: any[] }>,
    onDismissEvents: Array<{
      promise: (...args: any[]) => Promise<any>;
      arguments: any[];
    }> = [],
    message: string = "Loading..."
  ): Promise<void> {
    const loading = await this.loadingController.create({
      // cssClass: "my-custom-class",
      spinner: "bubbles",
      message,
      translucent: true,
    });
    await loading.present();

    for await (const event of events) {
      event.promise(...event.arguments);
    }

    await loading.dismiss();

    if (Array.isArray(onDismissEvents) && onDismissEvents.length > 0) {
      for await (const event of onDismissEvents) {
        event.promise(...event.arguments);
      }
    }
  }
}
