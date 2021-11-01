import { Component, OnInit } from "@angular/core";
import { DomController } from "@ionic/angular";
import { RafCallback } from "@ionic/angular/providers/dom-controller";

@Component({
  selector: "app-main",
  templateUrl: "./main.page.html",
  styleUrls: ["./main.page.scss"],
})
export class MainPage implements OnInit {
  constructor(private domCtrl: DomController) {
  }

  ngOnInit() {}
}
