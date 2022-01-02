// import { Injectable } from "@angular/core";
// import { AnimationBuilder, IonicSafeString, LoadingController } from "@ionic/angular";

// // imported manually as couldn't find how to import this type directly
// type Mode = "ios" | "md";
// type SpinnerTypes =
//   | "bubbles"
//   | "circles"
//   | "circular"
//   | "crescent"
//   | "dots"
//   | "lines"
//   | "lines-small";
// export interface LoadingOptions {
//   spinner?: SpinnerTypes | null;
//   message?: string | IonicSafeString;
//   cssClass?: string | string[];
//   showBackdrop?: boolean;
//   duration?: number;
//   translucent?: boolean;
//   animated?: boolean;
//   backdropDismiss?: boolean;
//   mode?: Mode;
//   keyboardClose?: boolean;
//   id?: string;
//   enterAnimation?: AnimationBuilder;
//   leaveAnimation?: AnimationBuilder;
// }

// @Injectable({
//   providedIn: "root",
// })
// export class LoadingService {
//   constructor(public loadingController: LoadingController) {}

//   defaultLoadingOptions: LoadingOptions = {
//     spinner: "bubbles",
//     translucent: true,
//     backdropDismiss: false,
//   };

//   /**
//    * Presents a loader until the promises in "events" complete (in series),
//    * then dismisses the loader and runs the promises in "onDismissEvents"
//    * @param events list of promises to complete while loader is spinning
//    * @param onDismissEvents list of promises to complete after loader is dismissed
//    * @param message message displayedp
//    */
//   async presentLoader(
//     events: Array<{ promise: (...args: any[]) => Promise<any>; arguments: any[] }>,
//     onDismissEvents: Array<{
//       promise: (...args: any[]) => Promise<any>;
//       arguments: any[];
//     }> = [],
//     message: string = "Loading..."
//   ): Promise<void> {
//     const loading = await this.loadingController.create({
//       message,
//       ...this.defaultLoadingOptions,
//     });
//     await loading.present();

//     for await (const event of events) {
//       event.promise(...event.arguments);
//     }

//     await loading.dismiss();

//     if (Array.isArray(onDismissEvents) && onDismissEvents.length > 0) {
//       for await (const event of onDismissEvents) {
//         event.promise(...event.arguments);
//       }
//     }
//   }
// }
