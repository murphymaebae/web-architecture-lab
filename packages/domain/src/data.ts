// Sample ("seed") data. In a real system this would live in databases owned by
// each service. Keeping it in code means the lab runs with zero setup.

import type { Order, Product, User } from "./types";

export const products: Product[] = [
  {
    id: "p1",
    slug: "summit-2-tent",
    name: "Summit 2 Tent",
    category: "tents",
    price: 349,
    description: "A two-person, three-season tent that pitches in five minutes.",
    emoji: "⛺",
    stock: 12,
    tags: ["backpacking", "lightweight"],
  },
  {
    id: "p2",
    slug: "ridgeline-45-pack",
    name: "Ridgeline 45L Pack",
    category: "packs",
    price: 189,
    description: "A 45 litre pack with an adjustable back panel for multi-day trips.",
    emoji: "🎒",
    stock: 30,
    tags: ["backpacking", "multi-day"],
  },
  {
    id: "p3",
    slug: "trail-runner-shoe",
    name: "Trail Runner Shoe",
    category: "footwear",
    price: 139,
    description: "Grippy, breathable shoes for fast days on rough ground.",
    emoji: "👟",
    stock: 4,
    tags: ["day-hike", "running"],
  },
  {
    id: "p4",
    slug: "alpine-hardshell",
    name: "Alpine Hardshell Jacket",
    category: "apparel",
    price: 429,
    description: "Waterproof, windproof shell built for high mountain weather.",
    emoji: "🧥",
    stock: 8,
    tags: ["alpine", "waterproof"],
  },
  {
    id: "p5",
    slug: "camp-stove",
    name: "Pocket Camp Stove",
    category: "cooking",
    price: 59,
    description: "Boils a litre of water in three minutes and folds to pocket size.",
    emoji: "🔥",
    stock: 50,
    tags: ["backpacking", "lightweight"],
  },
  {
    id: "p6",
    slug: "day-pack-20",
    name: "Daypack 20L",
    category: "packs",
    price: 79,
    description: "A simple, comfortable pack for snacks, water and a spare layer.",
    emoji: "🧳",
    stock: 22,
    tags: ["day-hike"],
  },
  {
    id: "p7",
    slug: "mountaineering-boot",
    name: "Mountaineering Boot",
    category: "footwear",
    price: 499,
    description: "Crampon-compatible insulated boots for glaciers and winter peaks.",
    emoji: "🥾",
    stock: 3,
    tags: ["alpine", "winter"],
  },
  {
    id: "p8",
    slug: "merino-base-layer",
    name: "Merino Base Layer",
    category: "apparel",
    price: 89,
    description: "Soft merino wool top that stays warm and does not smell after day three.",
    emoji: "👕",
    stock: 40,
    tags: ["day-hike", "backpacking", "alpine"],
  },
];

export const users: User[] = [
  { id: "u1", name: "Ada Hiker", email: "ada@example.com", segment: "weekend-hiker" },
  { id: "u2", name: "Bo Alpine", email: "bo@example.com", segment: "alpine-expert" },
  { id: "u3", name: "Cam Newbie", email: "cam@example.com", segment: "new-visitor" },
];

export const orders: Order[] = [
  {
    id: "o1",
    userId: "u1",
    lines: [
      { productId: "p6", quantity: 1 },
      { productId: "p8", quantity: 2 },
    ],
    status: "delivered",
    createdAt: "2026-09-14T10:30:00Z",
  },
  {
    id: "o2",
    userId: "u2",
    lines: [{ productId: "p4", quantity: 1 }],
    status: "shipped",
    createdAt: "2026-10-20T16:05:00Z",
  },
];
