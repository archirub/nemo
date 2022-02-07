import { NavOptions, createAnimation } from "@ionic/core";

interface TransitionOptions extends NavOptions {
  progressCallback?: (ani: Animation | undefined) => void;
  baseEl: any;
  enteringEl: HTMLElement;
  leavingEl: HTMLElement | undefined;
}

const getIonPageElement = (element: HTMLElement) => {
  if (element.classList.contains("ion-page")) {
    return element;
  }

  const ionPage = element.querySelector(
    ":scope > .ion-page, :scope > ion-nav, :scope > ion-tabs"
  );
  if (ionPage) {
    return ionPage;
  }
  // idk, return the original element so at least something animates
  // and we don't have a null pointer
  return element;
};

export function pageTransition(_: HTMLElement, opts: TransitionOptions) {
  const DURATION = 200;

  // root animation with common setup for the whole transition
  const rootTransition = createAnimation()
    .duration(DURATION)
    .easing("cubic-bezier(0.3,0,0.66,1)");

  // ensure that the entering page is visible from the start of the transition
  const enteringPage = createAnimation()
    .addElement(getIonPageElement(opts.enteringEl))
    .beforeRemoveClass("ion-page-invisible");

  // create animation for the leaving page
  const leavingPage = createAnimation().addElement(getIonPageElement(opts.leavingEl));

  // actual customized animation
  // if (opts.direction === "forward") {
  enteringPage.easing("cubic-bezier(0.5, 1, 0.89, 1)").fromTo("opacity", "0", "1");
  leavingPage.easing("cubic-bezier(0.5, 1, 0.89, 1)").fromTo("opacity", "1", "0");
  // enteringPage.fromTo("transform", "translateX(100%)", "translateX(0)");
  // leavingPage.fromTo("transform", "translateX(0)", "translateX(-100%)");
  // } else {
  //   leavingPage.fromTo("transform", "translateX(0)", "translateX(100%)");
  //   enteringPage.fromTo("transform", "translateX(-100%)", "translateX(0)");
  // }

  // include animations for both pages into the root animation
  rootTransition.addAnimation(enteringPage);
  rootTransition.addAnimation(leavingPage);
  return rootTransition;
}

export function pageTransitionToSettings(_: HTMLElement, opts: TransitionOptions) {
  const DURATION = 300;

  // root animation with common setup for the whole transition
  const rootTransition = createAnimation()
    .duration(DURATION)
    .easing("cubic-bezier(0.3,0,0.66,1)");

  // ensure that the entering page is visible from the start of the transition
  const enteringPage = createAnimation()
    .addElement(getIonPageElement(opts.enteringEl))
    .beforeRemoveClass("ion-page-invisible");

  // create animation for the leaving page
  const leavingPage = createAnimation().addElement(getIonPageElement(opts.leavingEl));

  // actual customized animation
  if (opts.direction === "forward") {
    // enteringPage.easing("cubic-bezier(0.5, 1, 0.89, 1)").fromTo("opacity", "0", "1");
    enteringPage.fromTo("transform", "translateY(100%)", "translateY(0)");
    leavingPage.fromTo("transform", "translateY(0)", "translateY(-100%)");
  } else {
    enteringPage.fromTo("transform", "translateY(0)", "translateY(100%)");
    leavingPage.fromTo("transform", "translateY(-100%)", "translateY(0)");
  }

  // leavingPage.easing("cubic-bezier(0.5, 1, 0.89, 1)").fromTo("opacity", "1", "0");

  // include animations for both pages into the root animation
  rootTransition.addAnimation(enteringPage);
  rootTransition.addAnimation(leavingPage);
  return rootTransition;
}

export function pageTransitionFromSettings(_: HTMLElement, opts: TransitionOptions) {
  const DURATION = 300;

  // root animation with common setup for the whole transition
  const rootTransition = createAnimation()
    .duration(DURATION)
    .easing("cubic-bezier(0.3,0,0.66,1)");

  // ensure that the entering page is visible from the start of the transition
  const enteringPage = createAnimation()
    .addElement(getIonPageElement(opts.enteringEl))
    .beforeRemoveClass("ion-page-invisible");

  // create animation for the leaving page
  const leavingPage = createAnimation().addElement(getIonPageElement(opts.leavingEl));

  enteringPage.fromTo("transform", "translateY(-100%)", "translateY(0)");
  leavingPage.fromTo("transform", "translateY(0)", "translateY(100%)");

  // leavingPage.easing("cubic-bezier(0.5, 1, 0.89, 1)").fromTo("opacity", "1", "0");

  // include animations for both pages into the root animation
  rootTransition.addAnimation(enteringPage);
  rootTransition.addAnimation(leavingPage);
  return rootTransition;
}
