import { Component, Input, OnInit, ViewChild, AfterViewInit, ElementRef, ViewChildren, QueryList } from "@angular/core";
import { IonButton } from "@ionic/angular";

@Component({
    selector: "nemo-toggle",
    templateUrl: "./nemo-toggle.component.html",
    styleUrls: ["./nemo-toggle.component.scss"],
})

export class AppToggleComponent implements AfterViewInit {
    @Input() selections: Array<string>;
    @Input() buttonWidth: number;
    @Input() fontSize: number;

    @ViewChild("handle") handle: any;
    @ViewChildren(IonButton) buttons: QueryList<IonButton>;

    constructor() {}

    ngAfterViewInit() {}

    selectOption(option) {
        for (let i = 0; i < this.buttons.toArray().length; i++) {
            if (this.buttons.toArray()[i].type === option) {
                this.handle.nativeElement.style.transform = `translateX(${i*this.buttonWidth}vw)`;
                this.handle.nativeElement.style.transition = "ease-in-out 0.1s";
            }
        };
        console.log(option, "selected");
        //option variable is the selection directly from the interfaces array
    } 
}