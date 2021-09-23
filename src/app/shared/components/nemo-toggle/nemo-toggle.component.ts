import {
  Component,
  Input,
  Output,
  ViewChild,
  AfterViewInit,
  EventEmitter,
  ViewChildren,
  QueryList,
  forwardRef,
  Renderer2,
} from "@angular/core";
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
      multi: true,
    },
  ],
})
export class AppToggleComponent
  extends EventEmitter
  implements AfterViewInit, ControlValueAccessor
{
  @Input() selections: Array<string>;
  @Input() buttonWidth: number;
  @Input() fontSize: number;

  disabled = false;

  onChange: any = () => {};
  onTouched: any = () => {};

  @Input() value: string | number;
  // Emits option selected from this child component to be accessed by parents
  @Output() valueChange = new EventEmitter();

  @ViewChild("handle") handle: any;
  @ViewChildren(IonButton) buttons: QueryList<IonButton>;

  constructor(private renderer: Renderer2) {
    super();
  }

  ngAfterViewInit() {
    this.valueChange.subscribe((v) => console.log("value change of nemo-toggle", v));
  }

  selectOption(option) {
    for (let i = 0; i < this.buttons.toArray().length; i++) {
      if (this.buttons.toArray()[i].type === option) {
        this.renderer.setStyle(
          this.handle.nativeElement,
          "transform",
          `translateX(${i * this.buttonWidth}vw)`
        );
        this.renderer.setStyle(
          this.handle.nativeElement,
          "transition",
          "ease-in-out 0.1s"
        );
      }
    }

    //Emit choice
    this.value = option;
    this.valueChange.emit(option);

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
