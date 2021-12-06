// import { ErrorHandler, Injectable, NgZone } from "@angular/core";
// import { FirebaseError } from "@firebase/util";
// import { AlertController } from "@ionic/angular";

// @Injectable()
// export class GlobalErrorHandler implements ErrorHandler {
//   constructor(private alertCtrl: AlertController, private zone: NgZone) {}

//   async handleError(error: any) {
//     // Check if it's an error from an HTTP response
//     // if (!(error instanceof HttpErrorResponse)) {
//     //   error = error.rejection; // get the error object
//     // }
//     // this.zone.run(() =>
//     //   this.errorDialogService.openDialog(
//     //     error?.message || 'Undefined client error',
//     //     error?.status
//     //   )
//     // );

//     const err = new Error();

//     await this.zone.run(async () => {
//       const alert = await this.alertCtrl.create({
//         message: `The error is
//         ${error}

//         and the stack is

//         ${err?.stack}`,
//         buttons: ["Okay"],
//       });

//       await alert.present();
//     });

//     if (error instanceof FirebaseError) {
//       console.error(
//         "FIREBASE ERROR: " +
//           (error as FirebaseError).code +
//           "   " +
//           (error as FirebaseError).name
//       );
//     } else {
//       console.error("NOT FIREBASE:", error);
//     }
//   }
// }
