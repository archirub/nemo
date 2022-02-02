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
  @Input() catchToggle: boolean = false;

  disabled = false;

  onChange: any = () => {};
  onTouched: any = () => {};

  value: string | number;

  // Emits option selected from this child component to be accessed by parents
  @Output() valueChange = new EventEmitter();

  @ViewChild("handle") handle: any;
  @ViewChildren(IonButton) buttons: QueryList<IonButton>;

  constructor(private renderer: Renderer2) {
    super();
  }

  ngAfterViewInit() {}

  selectOption(option) {
    this.applyStyling(option);
    this.value = option;
    this.valueChange.emit(option);
  }

  applyStyling(option) {
    // if (!this.handle || !this.buttons) return;

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
