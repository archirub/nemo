import { Injectable } from "@angular/core";
import { AngularFireFunctions } from "@angular/fire/functions";
import { reportUserRequest } from "@interfaces/cloud-functions.model";
import { UserReport } from "@interfaces/user-report.models";
import { ModalController } from "@ionic/angular";

@Injectable({
  providedIn: "root",
})
export class UserReportingService {
  constructor(
    private modalCtrl: ModalController,
    private afFunctions: AngularFireFunctions
  ) {}

  reportUser(report: UserReport) {
    const request: reportUserRequest = { report };

    return this.afFunctions.httpsCallable("reportUser")(request).toPromise();
  }

  async displayReportModal(
    reportComponent,
    userReportingID: string,
    userReportedID: string,
    userReportedName: string,
    userReportedPicture: string
  ) {
    const modal = await this.modalCtrl.create({
      component: reportComponent,
      showBackdrop: true,
      keyboardClose: true,
      componentProps: {
        userReportedID,
        userReportedName,
        userReportingID,
        userReportedPicture,
      },
    });

    return modal.present();
  }
}
