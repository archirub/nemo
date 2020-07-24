import { Component, OnInit, Input } from "@angular/core";
import { Profile } from "src/app/profile.model";

@Component({
  selector: "app-swipe-card",
  templateUrl: "./swipe-card.component.html",
  styleUrls: ["./swipe-card.component.scss"],
})
export class SwipeCardComponent implements OnInit {
  @Input() profiles: Profile[];

  constructor() {}

  ngOnInit() {}
}
