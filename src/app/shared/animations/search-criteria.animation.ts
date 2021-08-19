import { ElementRef } from "@angular/core";
import { AnimationController } from "@ionic/angular";
// import * as anime from "animejs"

export const SCenterAnimation = (
  tabComponent: ElementRef<any>,
  homeComponent: ElementRef<any>,
) => {

  const animation = (baseEl: any) => {
    // MODAL
    const wrapperAnimation = new AnimationController()
      .create()
      .addElement(baseEl.querySelector(".modal-wrapper")!)
      .duration(350)
      .easing('ease-in-out')
      .beforeStyles({
        height: "90vh",
        width: "90vw",
        '--border-radius': '20px',
        opacity: '1',
        overflow: 'inherit'
      })
      .fromTo(
        "transform",
        "translateY(-100vh)",
        "translateY(0vh)"
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
