import { Component, OnInit, Input } from "@angular/core";
import { profileSnapshot } from "@interfaces/profile";

@Component({
  selector: "app-swipe-card",
  templateUrl: "./swipe-card.component.html",
  styleUrls: ["./swipe-card.component.scss"],
})
export class SwipeCardComponent implements OnInit {
  @Input() profiles: profileSnapshot[];

  constructor() {}

  ngOnInit() {}
}
