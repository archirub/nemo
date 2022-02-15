import { Component, ElementRef, OnInit, ViewChild } from "@angular/core";
import { NavController } from "@ionic/angular";
import { firstValueFrom, ReplaySubject } from "rxjs";

@Component({
  selector: "app-welcome",
  templateUrl: "./welcome.page.html",
  styleUrls: ["./welcome.page.scss"],
})
export class WelcomePage implements OnInit {
  private videoPlayerRef$ = new ReplaySubject<ElementRef>(1);
  @ViewChild("videoPlayer", { read: ElementRef }) set videoPlayerSetter(ref: ElementRef) {
    if (ref) {
      this.videoPlayerRef$.next(ref);
    }
  }

  async playVideo() {
    return firstValueFrom(this.videoPlayerRef$).then((ref) => ref.nativeElement.play());
  }

  async pauseVideo() {
    return firstValueFrom(this.videoPlayerRef$).then((ref) => ref.nativeElement.pause());
  }

  constructor(private navCtrl: NavController) {}

  ngOnInit() {
    this.playVideo();
  }

  ionViewWillEnter() {
    this.playVideo();
  }

  async goToSignup() {
    await this.pauseVideo();
    return this.navCtrl.navigateForward("welcome/signupauth");
  }

  async goToLogin() {
    await this.pauseVideo();
    return this.navCtrl.navigateForward("welcome/login");
  }
}
