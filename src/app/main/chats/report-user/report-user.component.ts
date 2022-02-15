import { ModalController, NavController } from "@ionic/angular";
import { Component } from "@angular/core";

import { lastValueFrom } from "rxjs";

import { ChatboardStore } from "@stores/index";
import { UserReportingService } from "@services/user-reporting/user-reporting.service";

import { UserReport } from "@interfaces/user-report.models";
import { LoadingAndAlertManager } from "@services/loader-and-alert-manager/loader-and-alert-manager.service";

@Component({
  selector: "app-report-user",
  templateUrl: "./report-user.component.html",
  styleUrls: ["./report-user.component.scss"],
})
export class ReportUserComponent {
  // values obtained from modalController
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
    private chatboardStore: ChatboardStore,
    private loadingAlertManager: LoadingAndAlertManager,
    private navCtrl: NavController
  ) {}

  async reportUser() {
    const loader = await this.loadingAlertManager.createLoading({
      message: "Sending Report...",
    });

    await this.loadingAlertManager.presentNew(loader, "replace-erase");

    try {
      await this.userReportingService.reportUser(this.report, "dontHandle");
    } catch (e) {
      console.error(e);

      return this.reportFailedAlert();
    }

    this.description = "";

    await this.loadingAlertManager.dismissDisplayed();

    const chat = await lastValueFrom(
      this.chatboardStore.userHasChatWith(this.userReportedID)
    );

    if (chat === false) {
      this.reportSuccesfulNoChatAlert();
    } else {
      await this.reportSuccessfulHasChatAlert(chat.id);
    }

    return this.closeModal();
  }

  async closeModal() {
    return this.modalCtrl.dismiss();
  }

  // shows an alert saying the request failed
  async reportFailedAlert() {
    const alert = await this.loadingAlertManager.createAlert({
      header: "An error occurred...",
      message: "We were unable to complete your request, please try again.",
      buttons: ["Okay"],
    });

    return this.loadingAlertManager.presentNew(alert, "replace-erase");
  }

  // shows an alert saying the the report was successful.
  // Shown if the reported user ISN'T part of the user's chats
  async reportSuccesfulNoChatAlert() {
    const alert = await this.loadingAlertManager.createAlert({
      header: "The report was successfully sent.",
      message: "We may contact you directly if we require more details from you.",
      buttons: ["Okay"],
    });

    return this.loadingAlertManager.presentNew(alert, "replace-erase");
  }

  // shows an alert saying the the report was successful.
  // Shown if the reported user IS part of the user's chats
  async reportSuccessfulHasChatAlert(chatID: string) {
    let choice: "keep" | "delete" = "keep";

    const deleteMatch = async () => {
      const loader = await this.loadingAlertManager.createLoading({
        message: "Deleting match...",
      });

      await this.loadingAlertManager.presentNew(loader, "replace-erase");

      try {
        await lastValueFrom(this.chatboardStore.deleteChatOnDatabase(chatID));
      } catch (e) {
        console.error(e);

        return this.reportFailedAlert();
      }
      await lastValueFrom(this.chatboardStore.deleteChatInStore(chatID));

      await this.loadingAlertManager.dismissDisplayed();

      return this.navCtrl.navigateForward("main/tabs/chats");
    };

    const keepMatch = () => {};

    const alert = await this.loadingAlertManager.createAlert({
      header: "The report was successfully sent.",
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

    return this.loadingAlertManager.presentNew(alert, "replace-erase");
  }
}
