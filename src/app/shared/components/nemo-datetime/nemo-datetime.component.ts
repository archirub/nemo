import { Component, Input, OnInit, ViewChild, forwardRef} from '@angular/core';
import { ISODateString } from '@capacitor/core';
import { IonSlides } from '@ionic/angular';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-datetime-component',
  templateUrl: './nemo-datetime.component.html',
  styleUrls: ['./nemo-datetime.component.scss'],
  providers: [
    {
       provide: NG_VALUE_ACCESSOR,
       useExisting: forwardRef(() => AppDatetimeComponent),
       multi: true
    }
 ]
})
export class AppDatetimeComponent implements OnInit, ControlValueAccessor {
    @ViewChild('day') daySlides: IonSlides;
    @ViewChild('month') monthSlides: IonSlides;
    @ViewChild('year') yearSlides: IonSlides;

    @Input() yearRange: Array<number>;

    disabled = false;

    onChange: any = () => { };
    onTouched: any = () => { };

    completeDays: Array<number>;
    days: Array<number>;
    months: Array<string>;
    years: Array<number>;
    value: ISODateString;
    age: number;

    constructor() {}

    ngOnInit() {
        //For reference to push date value
        this.completeDays = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,
                    21,22,23,24,25,26,27,28,29,30,31];

        //Initialise ion slides
        this.days = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,
                    24,25,26,27,28,29,30,31];
        this.months = ["January", "February", "March", "April",
                        "May", "June", "July", "August",
                        "September", "October", "November", "December"]
        this.fillArray(this.yearRange[0], this.yearRange[1]);
    }

    ngAfterViewInit() {
        this.getDate();
    }

    fillArray(a,b) {
        this.years = [];
        for (let i = a; i >= b; i--) {
            this.years.push(i);
        };
    }

    async getDate() {
        var d = await this.daySlides.getActiveIndex();
        var m = await this.monthSlides.getActiveIndex();
        var y = await this.yearSlides.getActiveIndex();

        if (m === 3 || m === 5 || m === 8 || m === 10) { //30 days months
            this.days = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,
                        21,22,23,24,25,26,27,28,29,30];
            if (d > 29) {
                this.daySlides.slideTo(29);
            };
        } else if (m === 1 && this.years[y]%4 === 0) { //leap year case
            this.days = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,
                        21,22,23,24,25,26,27,28,29];
            if (d > 28) {
                this.daySlides.slideTo(28);
            };
        } else if (m === 1 && this.years[y]%4 != 0) { //feb has 28 days
            this.days = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,
                        21,22,23,24,25,26,27,28];
            if (d > 27) {
                this.daySlides.slideTo(27);
            };
        } else { //31 day months
            this.days = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,
                        21,22,23,24,25,26,27,28,29,30,31];
        };

        var birthday = new Date(`${this.months[m]} ${this.completeDays[d]}, ${this.years[y]} 12:00:00`);
        this.value = birthday.toISOString();
        this.onChange(this.value);

        var today = new Date();
        var dy = today.getFullYear() - birthday.getFullYear();
        var dm = today.getMonth() - birthday.getMonth();
        var dd = today.getDate() - birthday.getDate();

        if (dm < 0) {
            this.age = dy - 1;
        } else if (dm === 0 && dd < 0) {
            this.age = dy - 1;
        } else {
            this.age = dy
        };

        console.log("Selected:", this.value);
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
