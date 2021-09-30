import { Component } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { UserReport } from "@interfaces/user-report.models";
import { AlertController, LoadingController, ModalController } from "@ionic/angular";
import { LoadingService } from "@services/loading/loading.service";
import { UserReportingService } from "@services/user-reporting/user-reporting.service";
import { ChatboardStore } from "@stores/index";

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

  closeModal() {
    this.modalCtrl.dismiss();
  }

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

    const chatID = await this.chatboardStore
      .userHasChatWith(this.userReportedID)
      .toPromise();

    if (chatID === false) return this.reportSuccesfulNoChatAlert();
    return this.reportSuccessfulHasChatAlert(chatID);
  }

  async reportFailedAlert() {
    const alert = await this.alertCtrl.create({
      header: "An error occured...",
      message: "We were unable to complete your request, please try again.",
      buttons: ["Okay"],
    });

    return alert.present();
  }

  async reportSuccesfulNoChatAlert() {
    const alert = await this.alertCtrl.create({
      header: "The report was succesfully sent.",
      message: "We may contact you directly if we require more details from you.",
      buttons: ["Okay"],
    });

    return alert.present();
  }

  async reportSuccessfulHasChatAlert(chatID: string) {
    let choice: "keep" | "delete" = "keep";

    const deleteMatch = async () => {
      const loader = await this.loadingCtrl.create({
        ...this.loading.defaultLoadingOptions,
        message: "Deleting match...",
      });
      await loader.present();
      try {
        await this.chatboardStore.deleteChatOnDatabase(chatID).toPromise();
      } catch (e) {
        console.error(e);
        await loader.dismiss();
        return this.reportFailedAlert();
      }
      await this.chatboardStore.deleteChatInStore(chatID).toPromise();
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
