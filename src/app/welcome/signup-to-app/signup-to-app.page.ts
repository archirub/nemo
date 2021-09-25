import { NavController } from "@ionic/angular";
import { Component, OnInit } from "@angular/core";
import { Permissions, PermissionType } from "@capacitor/core";
import { GlobalStateManagementService } from "@services/global-state-management/global-state-management.service";

@Component({
  selector: "app-signup-to-app",
  templateUrl: "./signup-to-app.page.html",
  styleUrls: ["./signup-to-app.page.scss"],
})
export class SignupToAppPage implements OnInit {
  constructor(
    private navCtrl: NavController,
    private globalStateManagement: GlobalStateManagementService
  ) {}

  ngOnInit() {}
  async requestNotificationPermission() {
    console.log("requesting notification permission");
    return Permissions.query({ name: PermissionType.Notifications });
  }

  async goToApp() {
    this.globalStateManagement.globalManagement().toPromise(); // important to not await this, otherwise navCtrl never gets called
    return this.navCtrl.navigateRoot("/main/tabs/home");
  }
}
