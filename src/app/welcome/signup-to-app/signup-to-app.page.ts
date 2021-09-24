import { NavController } from "@ionic/angular";
import { Component, OnInit } from "@angular/core";
import { Permissions, PermissionType } from "@capacitor/core";

@Component({
  selector: "app-signup-to-app",
  templateUrl: "./signup-to-app.page.html",
  styleUrls: ["./signup-to-app.page.scss"],
})
export class SignupToAppPage implements OnInit {
  constructor(private navCtrl: NavController) {}

  ngOnInit() {}
  async requestNotificationPermission() {
    console.log("requesting notification permission");
    return Permissions.query({ name: PermissionType.Notifications });
  }

  async goToApp() {
    return this.navCtrl.navigateRoot("/main/tabs/home");
  }
}
