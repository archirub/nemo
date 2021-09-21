import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnInit,
  Output,
  ViewChild,
} from "@angular/core";

@Component({
  selector: "app-infinite-scroll",
  template: `<div #anchor></div>
    <ng-content></ng-content>`,
  styles: ["#anchor { height: 1px }"],
})
export class InfiniteScrollComponent {
  @Input() location: "above" | "below" = "above";
  @Input() options = {};
  @Output() scrolled = new EventEmitter();
  @ViewChild("anchor") anchor: ElementRef<HTMLElement>;

  private observer: IntersectionObserver;

  constructor(private host: ElementRef) {}

  get element() {
    return this.host.nativeElement;
  }

  ngAfterViewInit() {
    const options = {
      root: this.isHostScrollable() ? this.host.nativeElement : null,
      ...this.options,
    };

    console.log("options:", options);

    this.observer = new IntersectionObserver(([entry]) => {
      console.log("is intersecting? ", entry.isIntersecting);
      entry.isIntersecting && this.scrolled.emit();
    }, options);

    this.observer.observe(this.anchor.nativeElement);
  }

  private isHostScrollable() {
    const style = window.getComputedStyle(this.element);

    return (
      style.getPropertyValue("overflow") === "auto" ||
      style.getPropertyValue("overflow-y") === "scroll"
    );
  }

  ngOnDestroy() {
    this.observer.disconnect();
  }
}
