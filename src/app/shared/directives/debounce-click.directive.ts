import {
  Directive,
  EventEmitter,
  HostListener,
  Input,
  OnDestroy,
  OnInit,
  Output,
} from "@angular/core";
import { Subject, Subscription } from "rxjs";
import { debounceTime, map, throttle, throttleTime } from "rxjs/operators";

@Directive({
  selector: "[debounceClick]",
})
export class DebounceClickDirective implements OnInit, OnDestroy {
  @Input()
  debounceTime = 1000;

  @Output()
  debounceClick = new EventEmitter();

  private clicks = new Subject();
  private subscription: Subscription;

  constructor() {}

  ngOnInit() {
    this.subscription = this.clicks
      .pipe(
        throttleTime(this.debounceTime),
        map((e) => this.debounceClick.emit(e))
      )
      .subscribe();
  }

  ngOnDestroy() {
    this.subscription?.unsubscribe();
  }

  @HostListener("click", ["$event"])
  clickEvent(event) {
    event.preventDefault();
    event.stopPropagation();
    this.clicks.next(event);
  }
}
