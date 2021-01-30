import { Component, Input, OnInit, ViewChild } from "@angular/core";
import { IonContent } from "@ionic/angular";

@Component({
    selector: "add-photo",
    templateUrl: "./add-photo.component.html",
    styleUrls: ["./add-photo.component.scss"],
})

export class AddPhotoComponent implements OnInit {
    @ViewChild(IonContent) ionContent: IonContent;
    constructor() {}

    ngOnInit() {}
}