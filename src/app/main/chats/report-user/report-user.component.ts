import { AlertController, LoadingController, ModalController } from "@ionic/angular";
import { Component } from "@angular/core";

import { lastValueFrom } from "rxjs";

import { ChatboardStore } from "@stores/index";
import { LoadingService } from "@services/loading/loading.service";
import { UserReportingService } from "@services/user-reporting/user-reporting.service";

import { UserReport } from "@interfaces/user-report.models";

@Component({
  selector: "app-report-user",
  templateUrl: "./report-user.component.html",
  styleUrls: ["./report-user.component.scss"],
})
export class ReportUserComponent {
  // values given from opening the modal
  userReportedID: string;
  userReportedName: string;
  userReportedPicture: string;

  // values from template
  description: string = "";

  get report(): UserReport {
    return {
      userReportedID: this.userReportedID,
      descriptionByUserReporting: this.description,
    };
  }

  constructor(
    private userReportingService: UserReportingService,
    private modalCtrl: ModalController,
    private loadingCtrl: LoadingController,
    private loading: LoadingService,
    private alertCtrl: AlertController,
    private chatboardStore: ChatboardStore
  ) {}

  async reportUser() {
    const loader = await this.loadingCtrl.create({
      ...this.loading.defaultLoadingOptions,
      message: "Sending Report...",
    });
    await loader.present();
    try {
      await this.userReportingService.reportUser(this.report);
    } catch (e) {
      console.error(e);
      await loader.dismiss();
      return this.reportFailedAlert();
    }

    await loader.dismiss();

    const chatID = await lastValueFrom(
      this.chatboardStore.userHasChatWith(this.userReportedID)
    );

    if (chatID === false) return this.reportSuccesfulNoChatAlert();
    return this.reportSuccessfulHasChatAlert(chatID);
  }

  async closeModal() {
    return this.modalCtrl.dismiss();
  }

  // shows an alert saying the request failed
  async reportFailedAlert() {
    const alert = await this.alertCtrl.create({
      header: "An error occured...",
      message: "We were unable to complete your request, please try again.",
      buttons: ["Okay"],
    });

    return alert.present();
  }

  // shows an alert saying the the report was successful.
  // Shown if the reported user ISN'T part of the user's chats
  async reportSuccesfulNoChatAlert() {
    const alert = await this.alertCtrl.create({
      header: "The report was succesfully sent.",
      message: "We may contact you directly if we require more details from you.",
      buttons: ["Okay"],
    });

    return alert.present();
  }

  // shows an alert saying the the report was successful.
  // Shown if the reported user IS part of the user's chats
  async reportSuccessfulHasChatAlert(chatID: string) {
    let choice: "keep" | "delete" = "keep";

    const deleteMatch = async () => {
      const loader = await this.loadingCtrl.create({
        ...this.loading.defaultLoadingOptions,
        message: "Deleting match...",
      });
      await loader.present();
      try {
        await lastValueFrom(this.chatboardStore.deleteChatOnDatabase(chatID));
      } catch (e) {
        console.error(e);
        await loader.dismiss();
        return this.reportFailedAlert();
      }
      await lastValueFrom(this.chatboardStore.deleteChatInStore(chatID));
      return loader.dismiss();
    };

    const keepMatch = () => {};

    const alert = await this.alertCtrl.create({
      header: "The report was succesfully sent.",
      message: "Would you like to delete this match?",
      buttons: [
        {
          text: "Delete Match",
          handler: () => {
            choice = "delete";
          },
        },
        {
          text: "Keep Match",
          role: "cancel",
          handler: () => {
            choice = "keep";
          },
        },
      ],
    });

    alert.onDidDismiss().then(() => (choice === "delete" ? deleteMatch() : keepMatch()));

    return alert.present();
  }
}
