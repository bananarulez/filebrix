import type { AnalyticsEvent } from "./events";

export interface AnalyticsProvider {
  track(event: AnalyticsEvent): void;
}

const consoleProvider: AnalyticsProvider = {
  track(event) {
    if (process.env.NODE_ENV !== "production") {
      console.debug("[analytics]", event.name, event.payload);
    }
  },
};

let activeProvider: AnalyticsProvider = consoleProvider;

/** Swap in a real (privacy-conscious) provider later without touching call sites. */
export function setAnalyticsProvider(provider: AnalyticsProvider): void {
  activeProvider = provider;
}

export function track(event: AnalyticsEvent): void {
  activeProvider.track(event);
}

export type { AnalyticsEvent } from "./events";
