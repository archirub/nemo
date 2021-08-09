import { Component, Input, Output, ViewChild, AfterViewInit, EventEmitter, ViewChildren, QueryList, forwardRef } from "@angular/core";
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from "@angular/forms";
import { IonButton } from "@ionic/angular";

@Component({
    selector: "nemo-toggle",
    templateUrl: "./nemo-toggle.component.html",
    styleUrls: ["./nemo-toggle.component.scss"],
    providers: [
        {
           provide: NG_VALUE_ACCESSOR,
           useExisting: forwardRef(() => AppToggleComponent),
           multi: true
        }
     ]
})

export class AppToggleComponent extends EventEmitter implements AfterViewInit, ControlValueAccessor {
    @Input() selections: Array<string>;
    @Input() buttonWidth: number;
    @Input() fontSize: number;

    disabled = false;

    onChange: any = () => { };
    onTouched: any = () => { };

    // Emits option selected from this child component to be accessed by parents
    @Output() choice = new EventEmitter();

    @ViewChild("handle") handle: any;
    @ViewChildren(IonButton) buttons: QueryList<IonButton>;

    value: string | number;

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
        
        //Emit choice
        this.choice.emit(option);
        this.value = option;
        console.log(this.value);

        //option variable is the selection directly from the interfaces array
    }

    writeValue(value: string | number): void {
        this.value = value;
    }

    registerOnChange(fn: any): void {
        this.onChange = fn;
    }
    
    registerOnTouched(fn: any): void {
        this.onTouched = fn;
    }
    
    setDisabledState?(isDisabled: boolean): void {
        this.disabled = isDisabled;
    }
}