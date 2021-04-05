import { ElementRef } from "@angular/core";
import { AnimationController } from "@ionic/angular";
// import * as anime from "animejs"

export const SCenterAnimation = (
  tabComponent: ElementRef<any>,
  homeComponent: ElementRef<any>,
) => {

  const INITIAL_MODAL_HEIGHT = 85;
  const INITIAL_MODAL_WIDTH = 85;
  const FINAL_MODAL_HEIGHT = 90;
  const FINAL_MODAL_WIDTH = 90;
  const heightRatio = FINAL_MODAL_HEIGHT/INITIAL_MODAL_HEIGHT;
  const widthRatio = FINAL_MODAL_WIDTH/INITIAL_MODAL_WIDTH;

  const animation = (baseEl: any) => {
    // MODAL
    const wrapperAnimation = new AnimationController()
      .create()
      .addElement(baseEl.querySelector(".modal-wrapper")!)
      .duration(100)
      .beforeStyles({
        height: `${INITIAL_MODAL_HEIGHT}vh`,
        width: `${INITIAL_MODAL_WIDTH}vw`,
        '--border-radius': '20px',
        opacity: '0.5',
      })
      .fromTo(
        "opacity", "0.5", "1"
      )
      .fromTo(
        "transform",
        "scale(1,1)",
        `scale(${heightRatio}, ${widthRatio})`
      );

    // ALL CONTENT BELOW MODAL
    const contentAnimation = new AnimationController()
      .create()
      .addElement(homeComponent.nativeElement)
      .addElement(tabComponent.nativeElement)
      .fromTo("filter", "blur(0px)", "blur(20px)");

    // BACKDROP
    const backdropAnimation = new AnimationController()
      .create()
      .addElement(baseEl.querySelector("ion-backdrop"))
      .fromTo("opacity", "0.01", "var(--backdrop-opacity)")
      .fromTo("backdropFilter", "blur(0px) opacity(1)", "blur(100px) opacity(0)");

    return new AnimationController()
      .create()
      .addElement(baseEl)
      .easing("ease-out")
      .duration(200)
      .addAnimation([
        backdropAnimation,
        wrapperAnimation,
        contentAnimation,
      ]);
  };
  return animation;
};

export const SCleaveAnimation = (
  tabComponent: ElementRef<any>,
  homeComponent: ElementRef<any>,
) => {
  const animation = (baseEl) => {
    return SCenterAnimation(
      tabComponent,
      homeComponent,
    )(baseEl).direction("reverse");
  };
  return animation;
};
