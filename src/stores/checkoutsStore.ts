import { derived, get, writable } from "svelte/store";

import { session } from "../auth/store";
import { apiProjectRewardsIdGetUrl } from "../openapi/client/operation-paths.gen";
import { dropLegacyCart } from "../utils/checkouts/migrate";
import { checkoutRepo } from "../utils/checkouts/repository";
import { getDefaultCurrency } from "../utils/consts";
import { multiplyMoney, sumMoney } from "../utils/money";

import type { GatewayCharge, ProjectReward } from "../openapi/client";

export interface CheckoutItem extends GatewayCharge {
    key: string;
    kind: "free" | "reward" | "tip";
    quantity: number;
    /**
     * URL to the cover image, captured when the item was added to the cart.
     * Prefers the Reward's cover (1:1). When the item has no associated
     * Reward, the owning Project's cover (16:9) is used instead, and clients
     * must center it via CSS. Absent both, clients should fall back to a
     * placeholder.
     */
    cover?: string;

    /**
     * `target` references the Accounting that will receive the money\
     * `recipient` references the owner of that Accounting
     */
    recipient: string;
    recipientDisplayName: string;

    /**
     * Items of kind "reward" must have an associated ProjectReward
     */
    reward?: ProjectReward;
}

/**
 * IndexedDB record holding the pending checkout of a single user.
 * Keyed by `user:<id>` for authenticated sessions, `user:guest` otherwise.
 */
export interface StoredCheckout {
    key: string;
    items: Record<string, CheckoutItem>;
    updatedAt: number;
}

type CheckoutState = {
    items: Record<string, CheckoutItem>;
};

export interface CheckoutStore {
    subscribe: (run: (value: CheckoutState) => void) => () => void;

    addItem: (item: Omit<CheckoutItem, "key">) => void;
    removeItem: (key: string) => void;
    updateQuantity: (key: string, quantity: number) => void;

    clear: () => void;
    clearTarget: (target: string) => void;
    clearForUser: (userId?: string | number) => void;
}

const isBrowser = typeof window !== "undefined";

export const GUEST_CHECKOUT_KEY = "user:guest";

export function checkoutKeyForUser(userId?: string | number): string {
    return userId != null && userId !== "" ? `user:${userId}` : GUEST_CHECKOUT_KEY;
}

function generateKey(item: Omit<CheckoutItem, "key">): string {
    const base = `${item.kind}:${item.recipient}`;
    if (item.kind === "reward" && item.reward?.id != null) {
        return `${base};reward:${apiProjectRewardsIdGetUrl.replace("{id}", String(item.reward.id))}`;
    }
    return base;
}

export function parseKey(key: string): {
    kind: string;
    recipient: string;
    extra: { kind: string; recipient: string }[];
} {
    const segments = key.split(";");
    const colonIdx = segments[0].indexOf(":");
    const kind = segments[0].slice(0, colonIdx);
    const recipient = segments[0].slice(colonIdx + 1);
    const extra = segments.slice(1).map((s) => {
        const idx = s.indexOf(":");
        return { kind: s.slice(0, idx), recipient: s.slice(idx + 1) };
    });
    return { kind, recipient, extra };
}

const state = writable<CheckoutState>({ items: {} });

const hydrated = writable(false);

/**
 * True once the active user's record has been loaded from IndexedDB
 * into the in-memory store.
 */
export const checkoutHydrated = { subscribe: hydrated.subscribe };

let activeKey = GUEST_CHECKOUT_KEY;
let skipHydrationMerge = false;
let queue: Promise<void> = Promise.resolve();

function enqueue(task: () => Promise<void>): Promise<void> {
    queue = queue.then(task).catch((e) => {
        console.error("Error persisting checkout to IndexedDB:", e);
    });
    return queue;
}

/**
 * Resolves once every persistence operation enqueued so far has settled.
 */
export function checkoutReady(): Promise<void> {
    return queue;
}

function schedulePersist() {
    if (!isBrowser) return;

    const key = activeKey;
    enqueue(async () => {
        const { items } = get(state);
        await checkoutRepo.update(key, { items });
    });
}

if (isBrowser) {
    enqueue(async () => {
        // Snapshot the key: `activeKey` can flip mid-flight when the session
        // store resolves (guest → user), and writing the guest-derived items
        // back under the user key would wipe their stored checkout.
        const key = activeKey;
        dropLegacyCart();

        const record = await checkoutRepo.get(key);
        const loaded = record?.items ?? {};

        if (!skipHydrationMerge) {
            // Mutations made before hydration completes win over stored items
            let merged: Record<string, CheckoutItem> = {};
            state.update((current) => {
                merged = { ...loaded, ...current.items };
                return { items: merged };
            });
            await checkoutRepo.update(key, { items: merged });
        }

        hydrated.set(true);
    });

    session.subscribe((currentSession) => {
        const nextKey = checkoutKeyForUser(currentSession?.user?.id);
        if (nextKey === activeKey) return;

        const previousKey = activeKey;
        activeKey = nextKey;

        enqueue(async () => {
            if (previousKey === GUEST_CHECKOUT_KEY && nextKey !== GUEST_CHECKOUT_KEY) {
                // Merge the guest checkout into the user's record on login.
                // On conflicting item keys the user's stored item wins.
                const guest = await checkoutRepo.get(GUEST_CHECKOUT_KEY);
                const guestItems = guest?.items ?? {};

                if (Object.keys(guestItems).length > 0) {
                    const userRecord = await checkoutRepo.get(nextKey);
                    await checkoutRepo.update(nextKey, {
                        items: { ...guestItems, ...userRecord?.items },
                    });
                }

                await checkoutRepo.remove(GUEST_CHECKOUT_KEY);
            }

            const record = await checkoutRepo.get(nextKey);
            state.set({ items: record?.items ?? {} });
        });
    });

    const resyncActiveRecord = () => {
        if (!get(hydrated)) return;

        const key = activeKey;
        enqueue(async () => {
            const record = await checkoutRepo.get(key);
            state.set({ items: record?.items ?? {} });
        });
    };

    window.addEventListener("pageshow", (event) => {
        if (event.persisted) resyncActiveRecord();
    });

    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") resyncActiveRecord();
    });
}

export const cart: CheckoutStore = {
    subscribe: state.subscribe,

    addItem: (item: Omit<CheckoutItem, "key">) => {
        state.update((current) => {
            const key = generateKey(item);
            const items = { ...current.items };

            if (item.quantity === 0) {
                delete items[key];
                return { items };
            }

            items[key] = { ...item, key } as CheckoutItem;

            return { items };
        });
        schedulePersist();
    },

    removeItem: (key: string) => {
        state.update((current) => {
            const items = { ...current.items };
            delete items[key];
            return { items };
        });
        schedulePersist();
    },

    updateQuantity: (key: string, quantity: number) => {
        state.update((current) => {
            const items = { ...current.items };

            if (quantity <= 0) {
                delete items[key];
            } else if (items[key]) {
                items[key] = { ...items[key], quantity };
            }

            return { items };
        });
        schedulePersist();
    },

    clear: () => {
        skipHydrationMerge = true;
        state.set({ items: {} });

        if (!isBrowser) return;

        const key = activeKey;
        enqueue(() => checkoutRepo.remove(key));
        dropLegacyCart();
    },

    clearTarget: (target: string) => {
        state.update((current) => {
            const items = Object.fromEntries(
                Object.entries(current.items).filter((item) => item[1].target !== target),
            );

            return { items };
        });
        schedulePersist();
    },

    clearForUser: (userId?: string | number) => {
        skipHydrationMerge = true;
        state.set({ items: {} });

        if (!isBrowser) return;

        enqueue(async () => {
            await checkoutRepo.remove(GUEST_CHECKOUT_KEY);

            const key = checkoutKeyForUser(userId);
            if (key !== GUEST_CHECKOUT_KEY) {
                await checkoutRepo.remove(key);
            }
        });
        dropLegacyCart();
    },
};

/**
 * Standalone export so Astro inline scripts can clear without pulling in the store object.
 */
export const clearForUser = cart.clearForUser;

export const cartCount = derived(cart, ($cart) =>
    Object.values($cart.items).reduce((total, item) => total + item.quantity, 0),
);

export const cartAmount = derived(cart, ($cart) => {
    const items = Object.values($cart.items);
    if (items.length === 0) return { amount: 0, currency: getDefaultCurrency() };
    return sumMoney(items.map((item) => multiplyMoney(item.money, item.quantity)));
});

export const cartByTarget = derived(cart, ($cart) => {
    const grouped: Record<string, CheckoutItem[]> = {};

    for (const item of Object.values($cart.items)) {
        if (item.target != null) {
            grouped[item.target] ??= [];
            grouped[item.target].push(item);
        }
    }

    return grouped;
});

export const cartByRecipient = derived(cart, ($cart) => {
    const grouped: Record<string, CheckoutItem[]> = {};

    for (const item of Object.values($cart.items)) {
        const { recipient } = parseKey(item.key);
        grouped[recipient] ??= [];
        grouped[recipient].push(item);
    }

    return grouped;
});
