// Unit tests for the journey engine, using Node's built-in test runner.
// Run them with `npm test` from the repo root.
//
// Because the engine is plain TypeScript with no web server or database,
// tests are fast and simple: create an engine, feed it events, check the
// profile. Keeping business logic free of frameworks is what makes this easy.

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { JourneyEngine } from "./engine";

const view = (productId: string, tags: string[] = []) => ({
  type: "product_view",
  channel: "web" as const,
  anonymousId: "anon-1",
  productId,
  tags,
});

describe("JourneyEngine", () => {
  it("starts every visitor in the browsing stage", () => {
    const engine = new JourneyEngine();
    const profile = engine.track(view("p1"));
    assert.equal(profile.journeys["first-purchase"].state, "browsing");
    assert.equal(profile.segment, "new-visitor");
  });

  it("moves to 'interested' after viewing the same product twice", () => {
    const engine = new JourneyEngine();
    engine.track(view("p1"));
    const profile = engine.track(view("p1"));
    assert.equal(profile.journeys["first-purchase"].state, "interested");
    assert.deepEqual(profile.journeys["first-purchase"].history, ["browsing", "interested"]);
    // Entering 'interested' sends the reminder email
    assert.equal(profile.outbox.filter((m) => m.channel === "email").length, 1);
  });

  it("joins the alpine journey and becomes an alpine expert from behaviour", () => {
    const engine = new JourneyEngine();
    engine.track(view("p4", ["alpine"]));
    engine.track(view("p7", ["alpine"]));
    let profile = engine.track(view("p8", ["alpine"]));
    assert.equal(profile.journeys["alpine-upsell"].state, "curious");
    assert.equal(profile.segment, "alpine-expert");
    // Highest-priority web action now comes from the alpine journey
    assert.equal(engine.nextBestAction(profile, "web")?.journeyId, "alpine-upsell");

    profile = engine.track({ type: "order_placed", channel: "web", anonymousId: "anon-1", productId: "p7", tags: ["alpine"] });
    assert.equal(profile.journeys["alpine-upsell"].state, "equipped");
    assert.equal(profile.journeys["first-purchase"].state, "customer");
  });

  it("merges anonymous browsing into the customer profile on sign-in", () => {
    const engine = new JourneyEngine();
    engine.track(view("p1"));
    engine.track(view("p2"));
    // Same browser, now signed in as u1
    const profile = engine.track({ ...view("p3"), userId: "u1" });
    assert.equal(profile.id, "user:u1");
    assert.equal(profile.events.length, 3);
    assert.equal(profile.journeys["first-purchase"].state, "interested");
    // The anonymous id now points at the customer profile
    assert.equal(engine.find(undefined, "anon-1")?.id, "user:u1");
  });

  it("continues the journey on another channel for a known customer", () => {
    const engine = new JourneyEngine();
    engine.track({ ...view("p1"), userId: "u1" });
    engine.track({ ...view("p1"), userId: "u1" });
    // Later, on the mobile app (a different anonymous id, same user)
    const profile = engine.track({ type: "page_view", channel: "mobile", userId: "u1", anonymousId: "phone-1" });
    const action = engine.nextBestAction(profile, "mobile");
    assert.equal(action?.state, "interested");
  });

  it("does not merge a different customer's history from a shared browser", () => {
    const engine = new JourneyEngine();
    engine.track({ ...view("p1"), userId: "u1" });
    const u2 = engine.track({ ...view("p2"), userId: "u2" });
    assert.equal(u2.events.length, 1);
    assert.equal(engine.find("u1")?.events.length, 1);
  });
});
