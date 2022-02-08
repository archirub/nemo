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

// for best consistency, this component will need to be modified so that its internal state
// can be dictated by the parent component.
// I mean a problem right now with the logic (as of 08/02/2022) is the logic that the
// toggle is supposed to trigger fails and the real state is therefore what it was before
// the toggling, then it is not reflected in the template, it becomes inconsistent and the component fails
// ideally we would need ot be able to give feedback from the parent component to this component
// about whether it was successful and when it happened

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
  //created for the go under toggle so that the
  // animation can be synchronized with after the loading
  @Input() handleStylingInParent = false;

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
    if (!this.handleStylingInParent) this.applyStyling(option);
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
