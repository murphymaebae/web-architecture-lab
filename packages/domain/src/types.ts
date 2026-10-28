// The "domain" is the business we are modelling: a small outdoor-gear store
// called Trailhead Outfitters. These TypeScript types describe its data.
//
// A `type` in TypeScript is just a description of an object's shape. It has no
// effect when the code runs; it only helps your editor and the compiler catch
// mistakes (for example, typing `prodcut.price` or passing a string where a
// number is expected).

export type Category = "tents" | "packs" | "footwear" | "apparel" | "cooking";

export type Product = {
  id: string;
  slug: string; // URL-friendly name, e.g. "summit-2-tent"
  name: string;
  category: Category;
  price: number; // in US dollars
  description: string;
  emoji: string; // stands in for a product photo to keep the repo light
  stock: number;
  tags: string[];
};

// A "segment" is a group of customers we want to treat differently.
// Enterprise personalization tools (Adobe Target, Optimizely, Braze, etc.)
// are built around this idea.
export type Segment = "new-visitor" | "weekend-hiker" | "alpine-expert";

export type User = {
  id: string;
  name: string;
  email: string;
  segment: Segment;
};

export type OrderLine = {
  productId: string;
  quantity: number;
};

export type Order = {
  id: string;
  userId: string;
  lines: OrderLine[];
  status: "placed" | "shipped" | "delivered";
  createdAt: string; // ISO date string, e.g. "2026-10-01T12:00:00Z"
};

// Every place a customer can interact with the brand is a "channel".
// Omni-channel means giving people one joined-up experience across all of them.
// "push" means mobile push notifications, which behave differently from the
// app itself (they reach people when the app is closed).
export type Channel = "web" | "mobile" | "email" | "push" | "store";
