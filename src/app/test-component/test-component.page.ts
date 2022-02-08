import {
  AfterContentChecked,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
  ViewEncapsulation,
  // ViewEncapsulation,
} from "@angular/core";
import { SwiperComponent, SwiperSlideDirective } from "swiper/angular";

// import Swiper core and required modules
import SwiperCore, { Navigation, Pagination, Scrollbar, A11y } from "swiper";

// install Swiper modules
// SwiperCore.use([Navigation, Pagination, Scrollbar, A11y]);

// import "swiper/swiper-bundle.min.scss";
// import "swiper/swiper.scss";

// import "swiper/swiper.min.scss";

@Component({
  selector: "app-test-component",
  templateUrl: "./test-component.page.html",
  styleUrls: ["./test-component.page.scss"],
  // encapsulation: ViewEncapsulation.None,
})
export class TestComponentPage implements OnInit, AfterContentChecked {
  @ViewChild("picSlides") picSlides: ElementRef<SwiperComponent>;

  constructor() {}

  ngOnInit() {}

  ngAfterContentChecked(): void {
    if (this.picSlides) {
      // console.log("a", this.picSlides.nativeElement);
      // this.picSlides.updateSwiper({});
      this.picSlides.nativeElement.swiperRef;
    }
  }

  onSwiper(swiper: SwiperComponent) {
    // console.log(swiper.updateSwiper({}));
    console.log("a", swiper, swiper.updateInitSwiper({}));
  }
  onSlideChange() {
    console.log("slide change");
  }
}
