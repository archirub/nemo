import { StoreResetter } from "@services/global-state-management/store-resetter.service";
import { concatMap, mapTo, Observable, share } from "rxjs";

export abstract class AbstractStoreService {
  constructor(protected resetter: StoreResetter) {
    this.initChildDependentProperties();
  }
  // these are the only functions to define within the child class
  protected abstract systemsToActivate(): Observable<any>;
  protected abstract resetStore(): Promise<void>;
  public abstract isReady$: Observable<boolean>;

  // these functions are not to be touched in the child class
  public activate$: Observable<any>;
  public listenOnReset$ = this.resetter.resetOnEmit$.pipe(
    concatMap(async () => {
      await this.resetStore();
      this.activate$ = this.activate();
    })
  );

  // these functions are internal to the abstract class (and are unaccessible by the child)
  private activate() {
    return this.systemsToActivate().pipe(mapTo(null), share());
  }

  private initChildDependentProperties() {
    // setTimeout used so that this is done after initialization to not get error
    // "ReferenceError: Must call super constructor in derived class before accessing 'this' or returning from derived constructor"
    setTimeout(() => {
      this.activate$ = this.activate();
    }, 1);
  }
}
