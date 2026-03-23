export interface ShopSettingsPayload {
  shopName: string;
  currency: "MAD" | "EUR" | "USD";
  phone: string;
  address: string;
  receiptFooter: string;
}

export type LocalShopSettings = ShopSettingsPayload;

export const DEFAULT_SHOP_SETTINGS: ShopSettingsPayload = {
  shopName: "Mawad Scan",
  currency: "MAD",
  phone: "",
  address: "",
  receiptFooter: "Merci pour votre visite.",
};

const STORAGE_KEYS = {
  shopName: "shop_name",
  currency: "shop_currency",
  phone: "shop_phone",
  address: "shop_address",
  receiptFooter: "shop_receipt_footer",
} as const;

export function normalizeShopSettings(
  input?: Partial<ShopSettingsPayload> | null
): ShopSettingsPayload {
  return {
    shopName: input?.shopName?.trim() || DEFAULT_SHOP_SETTINGS.shopName,
    currency: input?.currency || DEFAULT_SHOP_SETTINGS.currency,
    phone: input?.phone?.trim() || "",
    address: input?.address?.trim() || "",
    receiptFooter: input?.receiptFooter?.trim() || DEFAULT_SHOP_SETTINGS.receiptFooter,
  };
}

export function readLocalShopSettings(): LocalShopSettings {
  if (typeof window === "undefined") {
    return DEFAULT_SHOP_SETTINGS;
  }

  return normalizeShopSettings({
    shopName: localStorage.getItem(STORAGE_KEYS.shopName) || DEFAULT_SHOP_SETTINGS.shopName,
    currency:
      (localStorage.getItem(STORAGE_KEYS.currency) as ShopSettingsPayload["currency"]) ||
      DEFAULT_SHOP_SETTINGS.currency,
    phone: localStorage.getItem(STORAGE_KEYS.phone) || DEFAULT_SHOP_SETTINGS.phone,
    address: localStorage.getItem(STORAGE_KEYS.address) || DEFAULT_SHOP_SETTINGS.address,
    receiptFooter:
      localStorage.getItem(STORAGE_KEYS.receiptFooter) ||
      DEFAULT_SHOP_SETTINGS.receiptFooter,
  });
}

export function saveLocalShopSettings(settings: LocalShopSettings) {
  if (typeof window === "undefined") {
    return;
  }

  const normalized = normalizeShopSettings(settings);

  localStorage.setItem(STORAGE_KEYS.shopName, normalized.shopName);
  localStorage.setItem(STORAGE_KEYS.currency, normalized.currency);
  localStorage.setItem(STORAGE_KEYS.phone, normalized.phone);
  localStorage.setItem(STORAGE_KEYS.address, normalized.address);
  localStorage.setItem(STORAGE_KEYS.receiptFooter, normalized.receiptFooter);
  window.dispatchEvent(new Event("storage"));
  window.dispatchEvent(new Event("shop-settings-updated"));
}
