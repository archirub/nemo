import { ElementRef } from "@angular/core";
import { AnimationController } from "@ionic/angular";

export const SCButtonHideAnimation = (
  searchCriteriaButtonRef: ElementRef<any>,
  easing: string,
  duration: number
) => {
  return new AnimationController()
    .create()
    .addElement(searchCriteriaButtonRef.nativeElement)
    .easing(easing)
    .duration(duration)
    .fromTo("opacity", 1, 0)
    .beforeStyles({ pointerEvents: "none" })
    .afterStyles({
      display: "none",
    });
};

export const SCButtonUnhideAnimation = (
  searchCriteriaButtonRef: ElementRef<any>,
  easing: string,
  duration: number
) => {
  return new AnimationController()
    .create()
    .addElement(searchCriteriaButtonRef.nativeElement)
    .easing(easing)
    .duration(duration)
    .fromTo("opacity", 0, 1)
    .beforeStyles({ pointerEvents: "all", display: "flex" });
};
