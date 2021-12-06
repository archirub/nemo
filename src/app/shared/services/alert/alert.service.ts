// import { Injectable, NgZone } from "@angular/core";
// import { AlertController } from "@ionic/angular";

// import { defer, Observable } from "rxjs";

// import { CustomErrorPopup, defaultErrorMessage } from "@interfaces/index";
// import { OverlayEventDetail } from "@ionic/core";

// @Injectable({
//   providedIn: "root",
// })
// export class AlertService {
//   constructor(private zone: NgZone, private alertCtrl: AlertController) {}

//   presentErrorAlert(error: CustomErrorPopup): Observable<OverlayEventDetail<any>> {
//     // using defer so that promise isn't read right away (thereby presenting the error message)
//     return defer(() =>
//       this.zone.run(async () => {
//         const alert = await this.alertCtrl.create({
//           header: error?.header ?? "An unknown error occurred",
//           message: error?.message ?? defaultErrorMessage,
//           buttons: ["Okay"],
//         });

//         await alert.present();

//         // returns this so that the following actions are only taken once the alert is dismissed
//         return alert.onDidDismiss();
//       })
//     );
//   }
// }
