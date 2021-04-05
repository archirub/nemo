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
   * @param message message displayed
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
      // duration: 5000,
      message,
      translucent: true,
      // backdropDismiss: true,
    });
    await loading.present();

    events.forEach(async (event) => {
      await event.promise(...event.arguments);
    });

    await loading.dismiss();

    if (Array.isArray(onDismissEvents) && onDismissEvents.length > 0) {
      onDismissEvents.forEach(async (event) => {
        await event.promise(...event.arguments);
      });
    }
  }
}
