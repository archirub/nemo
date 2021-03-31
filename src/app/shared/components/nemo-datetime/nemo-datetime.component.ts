import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { ISODateString } from '@capacitor/core';
import { IonSlides } from '@ionic/angular';

@Component({
  selector: 'app-datetime-component',
  templateUrl: './nemo-datetime.component.html',
  styleUrls: ['./nemo-datetime.component.scss'],
})
export class AppDatetimeComponent implements OnInit {
    @ViewChild('day') daySlides: IonSlides;
    @ViewChild('month') monthSlides: IonSlides;
    @ViewChild('year') yearSlides: IonSlides;

    @Input() yearRange: Array<number>;

    days: Array<number>;
    months: Array<string>;
    years: Array<number>;
    value: ISODateString;
    text: string;

    constructor() {}

    ngOnInit() {
        this.days = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,
                    21,22,23,24,25,26,27,28,29,30,31];
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
        this.text = `${this.days[d]} ${this.months[m]} ${this.years[y]}`;
        var birthday = new Date(`${this.months[m]} ${this.days[d]}, ${this.years[y]} 12:00:00`);
        this.value = birthday.toISOString();
        console.log("Selected:", this.value);
    }
}
