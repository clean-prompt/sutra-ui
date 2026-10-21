/** Private formatters shared by the billing modules. The locale comes from each component's `locale` prop (documented default "en-US"). */
import type { CardBrand } from "./payment-card";
import { formatShortDate } from "../../lib/time";

export const formatDay = (d: Date | string, locale?: string) => formatShortDate(d, { locale, year: "always" });

export const formatNumber = (n: number, locale?: string) => new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(n);

export const brandName = (b: CardBrand) =>
  ({ visa: "Visa", mastercard: "Mastercard", amex: "Amex", discover: "Discover", jcb: "JCB", unionpay: "UnionPay", rupay: "RuPay", unknown: "Card" })[b];
