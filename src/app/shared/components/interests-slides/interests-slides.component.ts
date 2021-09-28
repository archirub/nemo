import {
  Component,
  Input,
  OnInit,
  Output,
  EventEmitter,
  forwardRef,
  Renderer2,
  AfterViewInit,
} from "@angular/core";
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from "@angular/forms";

import {
  assetsInterestsPath,
  Interests,
  MAX_PROFILE_QUESTIONS_COUNT,
  searchCriteriaOptions,
} from "@interfaces/index";

@Component({
  selector: "interests-slides",
  templateUrl: "./interests-slides.component.html",
  styleUrls: ["./interests-slides.component.scss"],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => InterestSlidesComponent),
      multi: true,
    },
  ],
})
export class InterestSlidesComponent implements AfterViewInit, ControlValueAccessor {
  @Input() listed: boolean = true; //Option to hide the listed interests, automatically shown (false = hidden)
  _interests: Interests[] = [];
  @Input() set interests(value: Interests[]) {
    this._interests = value && Array.isArray(value) ? value : [];
  }
  get interests(): Interests[] {
    return this._interests ?? [];
  }
  @Output() interestsChange = new EventEmitter<Interests[]>();

  pictures = assetsInterestsPath;
  names = searchCriteriaOptions.interests;
  slideOpts;
  slideWidth: number;

  constructor(private renderer: Renderer2) {}

  ngAfterViewInit() {
    const componentRef = this; // must be a const and be defined here; in use in this.slideOpts
    this.slideOpts = {
      speed: 200,
      resistanceRatio: 0.5,
      freeMode: true,
      //freeModeSticky: true,
      coverflowEffect: {
        rotate: 0,
        stretch: 20,
        depth: 150,
        modifier: 1,
        slideShadows: false,
      },
      on: {
        beforeInit() {
          const swiper = this;

          swiper.classNames.push(`${swiper.params.containerModifierClass}coverflow`);
          swiper.classNames.push(`${swiper.params.containerModifierClass}3d`);

          swiper.params.watchSlidesProgress = true;
          swiper.originalParams.watchSlidesProgress = true;
        },
        setTranslate: function () {
          const swiper = this;
          const {
            width: swiperWidth,
            height: swiperHeight,
            slides,
            $wrapperEl,
            slidesSizesGrid,
            $,
          } = swiper;
          const params = swiper.params.coverflowEffect;
          const isHorizontal = swiper.isHorizontal();
          const transform$$1 = swiper.translate;
          const center = isHorizontal
            ? -transform$$1 + swiperWidth / 2
            : -transform$$1 + swiperHeight / 2;
          const rotate = isHorizontal ? params.rotate : -params.rotate;
          const translate = params.depth;
          // Each slide offset from center
          for (let i = 0, length = slides.length; i < length; i += 1) {
            const $slideEl = slides.eq(i);
            const slideSize = slidesSizesGrid[i];
            const slideOffset = $slideEl[0].swiperSlideOffset;
            const offsetMultiplier =
              ((center - slideOffset - slideSize / 2) / slideSize) * params.modifier;

            let rotateY = isHorizontal ? rotate * offsetMultiplier : 0;
            let rotateX = isHorizontal ? 0 : rotate * offsetMultiplier;
            // const rotateZ = 0
            let translateZ = -translate * Math.abs(offsetMultiplier);

            let translateY = isHorizontal ? 0 : params.stretch * offsetMultiplier;
            let translateX = isHorizontal ? params.stretch * offsetMultiplier : 0;

            // Fix for ultra small values
            if (Math.abs(translateX) < 0.001) translateX = 0;
            if (Math.abs(translateY) < 0.001) translateY = 0;
            if (Math.abs(translateZ) < 0.001) translateZ = 0;
            if (Math.abs(rotateY) < 0.001) rotateY = 0;
            if (Math.abs(rotateX) < 0.001) rotateX = 0;

            const slideTransform = `translate3d(${translateX}px,${translateY}px,${translateZ}px)  rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;

            $slideEl.transform(slideTransform);

            componentRef.renderer.setStyle(
              $slideEl[0],
              "zIndex",
              -Math.abs(Math.round(offsetMultiplier)) + 1
            );
            if (params.slideShadows) {
              // Set shadows
              let $shadowBeforeEl = isHorizontal
                ? $slideEl.find(".swiper-slide-shadow-left")
                : $slideEl.find(".swiper-slide-shadow-top");
              let $shadowAfterEl = isHorizontal
                ? $slideEl.find(".swiper-slide-shadow-right")
                : $slideEl.find(".swiper-slide-shadow-bottom");
              if ($shadowBeforeEl.length === 0) {
                $shadowBeforeEl = swiper.$(
                  `<div class="swiper-slide-shadow-${
                    isHorizontal ? "left" : "top"
                  }"></div>`
                );
                $slideEl.append($shadowBeforeEl);
              }
              if ($shadowAfterEl.length === 0) {
                $shadowAfterEl = swiper.$(
                  `<div class="swiper-slide-shadow-${
                    isHorizontal ? "right" : "bottom"
                  }"></div>`
                );
                $slideEl.append($shadowAfterEl);
              }
              if ($shadowBeforeEl.length)
                componentRef.renderer.setStyle(
                  $shadowBeforeEl[0],
                  "opacity",
                  offsetMultiplier > 0 ? offsetMultiplier : 0
                );
              if ($shadowAfterEl.length)
                componentRef.renderer.setStyle(
                  $shadowAfterEl[0],
                  "opacity",
                  -offsetMultiplier > 0 ? -offsetMultiplier : 0
                );
            }
          }

          // Set correct perspective for IE10
          if (swiper.support.pointerEvents || swiper.support.prefixedPointerEvents) {
            const ws = $wrapperEl[0].style;
            ws.perspectiveOrigin = `${center}px 50%`;
          }
        },
        setTransition(duration) {
          const swiper = this;
          swiper.slides
            .transition(duration)
            .find(
              ".swiper-slide-shadow-top, .swiper-slide-shadow-right, .swiper-slide-shadow-bottom, .swiper-slide-shadow-left"
            )
            .transition(duration);
        },
      },
    };
  }
  ngOnInit() {
    //this.pictures = assetsInterestsPath;
    //this.names = searchCriteriaOptions.interests;
  }

  selectInterest(choice) {
    if (this.interests.includes(choice)) {
      const index = this.interests.indexOf(choice);
      this.interests.splice(index, 1);
    } else if (!this.reachedMaxInterestsCount) {
      this.interests.push(choice);
    }
    this.interestsChange.emit(this.interests);
    this.onChange(this.interests);
    this.onTouched();
  }

  getPicturePath(interestName: Interests): string {
    const formattedName = interestName.replace(/\s/g, "").toLowerCase();
    return "/assets/interests/" + formattedName + ".svg";
  }

  // ControlValueAccessor Implementation
  onChange: any = () => {};
  onTouched: any = () => {};

  registerOnChange(fn: any) {
    this.onChange = fn;
  }

  registerOnTouched(fn: any) {
    this.onTouched = fn;
  }

  writeValue(value: Interests[]) {
    this.interests = value;
    this.interestsChange.emit(this.interests);
  }

  setDisabledState(isDisabled: boolean) {
    //this.disabled = isDisabled;
  }

  get reachedMaxInterestsCount(): boolean {
    return this.interestsCount >= MAX_PROFILE_QUESTIONS_COUNT;
  }

  get interestsCount(): number {
    return this.interests.length ?? 0;
  }
}
