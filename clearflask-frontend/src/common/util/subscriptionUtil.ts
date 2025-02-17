// SPDX-FileCopyrightText: 2019-2021 Matus Faro <matus@smotana.com>
// SPDX-License-Identifier: AGPL-3.0-only
import { useEffect } from "react";
import { useForceUpdate } from "./reactUtil";
import randomUuid from "./uuid";

export type Subscriber<T> = ((data: T) => void);
export type Unsubscribe = () => void;

export default class Subscription<T> {
  readonly subscribers: { [subscriberId: string]: Subscriber<T> } = {};
  value: T;

  constructor(initialValue: T) {
    this.value = initialValue;
  }

  subscribe(subscriber: Subscriber<T>): Unsubscribe {
    const subscriberId = randomUuid();
    this.subscribers[subscriberId] = subscriber;
    return () => {
      delete this.subscribers[subscriberId];
    };
  }

  notify(data: T): void {
    this.value = data;
    for (const subscriber of Object.values(this.subscribers)) {
      subscriber && subscriber(data);
    }
  }

  getValue(): T {
    return this.value;
  }
}

export const useSubsciption = <T>(subscription?: Subscription<T>) => {
  const forceUpdate = useForceUpdate();
  useEffect(() => {
    const unsubscribe = subscription?.subscribe(data => forceUpdate());
    return () => unsubscribe?.();
  }, [subscription]); // eslint-disable-line react-hooks/exhaustive-deps
  return subscription?.getValue();
}
