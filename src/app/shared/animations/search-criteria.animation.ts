import { ElementRef } from "@angular/core";
import { AnimationController } from "@ionic/angular";
// import * as anime from "animejs"

export const SCenterAnimation = (
  searchButton: ElementRef<any>,
  tabComponent: ElementRef<any>,
  homeComponent: ElementRef<any>,
  screenWidth: number,
  screenHeight: number
) => {
  const buttonXPosition = searchButton.nativeElement.getBoundingClientRect().x;
  const buttonYPosition = searchButton.nativeElement.getBoundingClientRect().y;
  const buttonWidth = searchButton.nativeElement.getBoundingClientRect().width;
  const buttonHeight = searchButton.nativeElement.getBoundingClientRect().height;

  const startingHorizontalPosition = buttonXPosition - screenWidth / 2 + buttonWidth / 2;
  const startingVerticalPosition = buttonYPosition - screenHeight / 2 + buttonHeight / 2;

  const FINAL_MODAL_HEIGHT = 90;
  const FINAL_MODAL_WIDTH = 90;
  const scalingFactorHeight = FINAL_MODAL_HEIGHT / buttonHeight;
  const scalingFactorWidth = FINAL_MODAL_WIDTH / buttonWidth;
  const inverseSFheight = 1 / scalingFactorHeight;
  const inverseSFwidth = 1 / scalingFactorWidth;

  const animation = (baseEl: any) => {
    // BUTTON
    // const buttonAnimation = this.animationCtrl
    //   .create()
    //   .addElement(this.searchButton.nativeElement)
    //   .fromTo("transform", "scale3d(1,1,1)", "scale3d(35,35,1)");

    // MODAL
    const wrapperAnimation = new AnimationController()
      .create()
      .addElement(baseEl.querySelector(".modal-wrapper")!)
      .beforeStyles({
        height: `${FINAL_MODAL_HEIGHT}vh`,
        width: `${FINAL_MODAL_WIDTH}vw`,
        //overflow: 'scroll',
        //'--overflow': 'scroll',
        '--border-radius': '20px',
      })
      // .afterStyles({ height: "20px", width: "20px" })
      .fromTo(
        "transform",
        `translate(${startingHorizontalPosition}px, ${startingVerticalPosition}px) scale(${inverseSFwidth},${inverseSFheight})`,
        `translate(0%, 0%) scale(1,1)`
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
        // buttonAnimation,
      ]);
  };
  return animation;
};

export const SCleaveAnimation = (
  searchButton: ElementRef<any>,
  tabComponent: ElementRef<any>,
  homeComponent: ElementRef<any>,
  screenWidth: number,
  screenHeight: number
) => {
  const animation = (baseEl) => {
    return SCenterAnimation(
      searchButton,
      tabComponent,
      homeComponent,
      screenWidth,
      screenHeight
    )(baseEl).direction("reverse");
  };
  return animation;
};
