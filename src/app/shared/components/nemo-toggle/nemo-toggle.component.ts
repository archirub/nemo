import { Component, Input, Output, ViewChild, AfterViewInit, EventEmitter, ViewChildren, QueryList } from "@angular/core";
import { IonButton } from "@ionic/angular";

@Component({
    selector: "nemo-toggle",
    templateUrl: "./nemo-toggle.component.html",
    styleUrls: ["./nemo-toggle.component.scss"],
})

export class AppToggleComponent extends EventEmitter implements AfterViewInit {
    @Input() selections: Array<string>;
    @Input() buttonWidth: number;
    @Input() fontSize: number;

    // Emits option selected from this child component to be accessed by parents
    @Output() choice = new EventEmitter();

    @ViewChild("handle") handle: any;
    @ViewChildren(IonButton) buttons: QueryList<IonButton>;

    selection;

    constructor() {
        super();
    }

    ngAfterViewInit() {}

    selectOption(option) {
        for (let i = 0; i < this.buttons.toArray().length; i++) {
            if (this.buttons.toArray()[i].type === option) {
                this.handle.nativeElement.style.transform = `translateX(${i*this.buttonWidth}vw)`;
                this.handle.nativeElement.style.transition = "ease-in-out 0.1s";
            }
        };
        console.log(option, "selected");
        
        //Emit choice
        this.choice.emit(option);
        this.selection = option;

        //option variable is the selection directly from the interfaces array
    } 
}