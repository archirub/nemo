import { Injectable } from "@angular/core";
import { ModalController } from "@ionic/angular";
import { AngularFireFunctions } from "@angular/fire/functions";

import { firstValueFrom } from "rxjs";

import { GlobalErrorHandler } from "@services/errors/global-error-handler.service";

import { reportUserRequest } from "@interfaces/cloud-functions.model";
import { UserReport } from "@interfaces/user-report.models";

@Injectable({
  providedIn: "root",
})
export class UserReportingService {
  constructor(
    private modalCtrl: ModalController,
    private afFunctions: AngularFireFunctions,
    private errorHandler: GlobalErrorHandler
  ) {}

  reportUser(report: UserReport) {
    const request: reportUserRequest = { report };

    return firstValueFrom(
      this.afFunctions
        .httpsCallable("reportUser")(request)
        .pipe(
          this.errorHandler.convertErrors("cloud-functions"),
          this.errorHandler.handleErrors()
        )
    );
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
