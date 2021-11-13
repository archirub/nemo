import {
  Component,
  Input,
  OnInit,
  ViewChild,
  forwardRef,
  Output,
  EventEmitter,
} from "@angular/core";
import { ISODateString } from "@capacitor/core";
import { IonSlides } from "@ionic/angular";
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from "@angular/forms";

@Component({
  selector: "app-datetime-component",
  templateUrl: "./nemo-datetime.component.html",
  styleUrls: ["./nemo-datetime.component.scss"],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AppDatetimeComponent),
      multi: true,
    },
  ],
})
export class AppDatetimeComponent implements OnInit, ControlValueAccessor {
  @ViewChild("day") daySlides: IonSlides;
  @ViewChild("month") monthSlides: IonSlides;
  @ViewChild("year") yearSlides: IonSlides;

  @Input() yearRange: Array<number>;

  disabled = false;

  onChange: any = () => {};
  onTouched: any = () => {};

  completeDays: Array<number>;
  days: Array<number>;
  months: Array<string>;
  years: Array<number>;
  value: any; // property used for the form control in signup
  age: number;

  @Output() ageChange = new EventEmitter();

  constructor() {}

  ngOnInit() {
    //For reference to push date value
    this.completeDays = [
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23,
      24, 25, 26, 27, 28, 29, 30, 31,
    ];

    //Initialise ion slides
    this.days = [
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23,
      24, 25, 26, 27, 28, 29, 30, 31,
    ];
    this.months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    this.fillArray(this.yearRange[0], this.yearRange[1]);
  }

  fillArray(a, b) {
    this.years = [];
    for (let i = a; i >= b; i--) {
      this.years.push(i);
    }
  }

  async getWrittenValue() {
    /*
     * Checks if component's value has been written by formControls,
     * Updates UI accordingly by getting saved day index, month index and year index
     */
    if (typeof this.value === "string") {
      const currentYear = new Date().getFullYear();
      const date = new Date(Date.parse(this.value));
      const y = currentYear - date.getFullYear() - 1; //Year slide indexes run backwards, i.e. 2001 is on index 19, -1 for indexes starting at 0
      const m = date.getMonth();
      const d = date.getDate() - 1; //-1 for indexes starting at 0

      this.updateOptions(d, m, y);

      await Promise.all([
        this.daySlides.slideTo(d),
        this.monthSlides.slideTo(m),
        this.yearSlides.slideTo(y),
      ]);
    }
  }

  updateOptions(d, m, y) {
    if (m === 3 || m === 5 || m === 8 || m === 10) {
      //30 days months
      this.days = [
        1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23,
        24, 25, 26, 27, 28, 29, 30,
      ];
      if (d > 29) {
        this.daySlides.slideTo(29);
      }
    } else if (m === 1 && this.years[y] % 4 === 0) {
      //leap year case
      this.days = [
        1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23,
        24, 25, 26, 27, 28, 29,
      ];
      if (d > 28) {
        this.daySlides.slideTo(28);
      }
    } else if (m === 1 && this.years[y] % 4 != 0) {
      //feb has 28 days
      this.days = [
        1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23,
        24, 25, 26, 27, 28,
      ];
      if (d > 27) {
        this.daySlides.slideTo(27);
      }
    } else {
      //31 day months
      this.days = [
        1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23,
        24, 25, 26, 27, 28, 29, 30, 31,
      ];
    }
  }

  async getDate() {
    const [d, m, y] = await Promise.all([
      this.daySlides.getActiveIndex(),
      this.monthSlides.getActiveIndex(),
      this.yearSlides.getActiveIndex(),
    ]);

    this.updateOptions(d, m, y);

    const birthday = new Date(
      `${this.months[m]} ${this.completeDays[d]}, ${this.years[y]} 12:00:00`
    );
    this.value = birthday.toISOString();
    this.onChange(this.value);

    const today = new Date();
    const dy = today.getFullYear() - birthday.getFullYear();
    const dm = today.getMonth() - birthday.getMonth();
    const dd = today.getDate() - birthday.getDate();

    if (dm < 0) {
      this.age = dy - 1;
    } else if (dm === 0 && dd < 0) {
      this.age = dy - 1;
    } else {
      this.age = dy;
    }

    this.ageChange.emit(this.age);
  }

  writeValue(value: ISODateString): void {
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
