import type { FieldDef } from "./types";

export type FormState = "open" | "soon" | "closed" | "full";

/** Everything the public form (and the builder preview) needs. Pure data, safe for client components. */
export type PublicForm = {
  slug: string;
  title: string;
  description?: string | null;
  fields: FieldDef[];
  submitLabel: string;
  successMessage: string;
  successTitle?: string | null;
  successRedirect?: string | null;
  coverImage?: string | null;
  logo?: string | null;
  theme?: string;
  payMode?: string;
  basePriceRials?: number;
  hasDiscounts?: boolean;
  state?: FormState;
  opensAt?: string | null;
  closesAt?: string | null;
  capacity?: number | null;
  remaining?: number | null;
};
