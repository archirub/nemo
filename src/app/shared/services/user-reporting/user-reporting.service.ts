import { Injectable } from "@angular/core";
import { UserReport } from "@interfaces/user-report.models";
import { ModalController } from "@ionic/angular";

@Injectable({
  providedIn: "root",
})
export class UserReportingService {
  constructor(private modalCtrl: ModalController) {}

  reportUser(report: UserReport) {
    console.log("user reported");
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
      componentProps: { userReportedID, userReportedName, userReportingID, userReportedPicture },
    });

    return modal.present();
  }
}
