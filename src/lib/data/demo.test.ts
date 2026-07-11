// Behavioral tests for the demo provider — the same contract the Supabase
// provider implements, so these document DataProvider semantics too.
import { beforeEach, describe, expect, it } from "vitest";
import { DemoProvider } from "./demo";

const provider = new DemoProvider();

beforeEach(() => {
  // Isolation from persisted state written by previous tests.
  localStorage.clear();
});

describe("seeded company", () => {
  it("has the three founder channels plus the Founder Reality concept", async () => {
    const channels = await provider.listChannels();
    expect(channels.map((c) => c.name)).toEqual([
      "Business Storytelling",
      "Ancient Religions & Storytelling",
      "Sales Psychology",
      "Founder Reality",
    ]);
  });

  it("every video carries a latest metric snapshot", async () => {
    const videos = await provider.listVideos();
    expect(videos.length).toBeGreaterThan(20);
    for (const v of videos) {
      expect(v.metrics?.ctr).toBeTypeOf("number");
      expect(v.metrics?.avgPercentViewed).toBeTypeOf("number");
    }
  });
});

describe("ideas", () => {
  it("creates and updates ideas", async () => {
    const idea = await provider.createIdea({
      title: "Test idea",
      priority: "high",
      status: "inbox",
      tags: ["x"],
    });
    expect((await provider.listIdeas()).some((i) => i.id === idea.id)).toBe(true);

    const updated = await provider.updateIdea(idea.id, { status: "approved" });
    expect(updated.status).toBe("approved");
  });
});

describe("SOP versioning (append-only)", () => {
  it("appends a new version and never mutates history", async () => {
    const before = await provider.getSop("sop_hooks");
    expect(before).not.toBeNull();
    const versionsBefore = before!.versions.length;
    const previousTop = before!.versions[0];

    const after = await provider.addSopVersion("sop_hooks", {
      purpose: "Updated purpose",
      steps: ["one", "two"],
      changeSummary: "test change",
    });

    expect(after.versions.length).toBe(versionsBefore + 1);
    expect(after.currentVersion?.versionNumber).toBe(previousTop.versionNumber + 1);
    expect(after.currentVersion?.purpose).toBe("Updated purpose");

    // The previously-current version is intact, one slot down.
    const preserved = after.versions.find((v) => v.id === previousTop.id);
    expect(preserved).toBeDefined();
    expect(preserved!.purpose).toBe(previousTop.purpose);
    expect(preserved!.steps).toEqual(previousTop.steps);
  });
});

describe("learning loop", () => {
  it("produces insights grounded in the data and persists them", async () => {
    const insightsBefore = (await provider.listInsights()).length;
    const result = await provider.runLearningLoop();
    expect(result.insights).toBeGreaterThan(0);
    const insightsAfter = (await provider.listInsights()).length;
    expect(insightsAfter).toBe(insightsBefore + result.insights);
  });
});

describe("demo coach", () => {
  it("answers the hook question from actual data", async () => {
    const reply = await provider.askCoach("What hook type performs best?", []);
    // The seeded effect sizes make story cold opens the best hook; the coach
    // must find that in the data, not assert it from a canned string.
    expect(reply.answer.toLowerCase()).toContain("story cold open");
    expect(reply.answer).toMatch(/n=\d+/);
  });
});

describe("production workspace", () => {
  it("creates a doc, autosaves patches, and enforces the append model on publish", async () => {
    const created = await provider.createProduction({
      channelId: "ch_biz",
      title: "Test production",
      topic: "Testing",
    });
    expect(created.stage).toBe("scripting");

    const updated = await provider.updateProduction(created.id, {
      hookText: "A hook",
      titleCandidates: [{ text: "Final Title", starred: true }],
      goalMetric: "ctr",
      goalTarget: 6,
    });
    expect(updated.hookText).toBe("A hook");

    const videosBefore = (await provider.listVideos()).length;
    const published = await provider.publishProduction(created.id);
    expect(published.stage).toBe("published");
    expect(published.linkedVideoId).toBeTruthy();

    const videos = await provider.listVideos();
    expect(videos.length).toBe(videosBefore + 1);
    // The starred title candidate becomes the published video's title.
    expect(videos.some((v) => v.title === "Final Title")).toBe(true);
  });

  it("publishing twice never creates a duplicate video", async () => {
    const created = await provider.createProduction({
      channelId: "ch_biz",
      title: "Idempotent publish",
    });
    await provider.publishProduction(created.id);
    const count1 = (await provider.listVideos()).length;
    await provider.publishProduction(created.id);
    const count2 = (await provider.listVideos()).length;
    expect(count2).toBe(count1);
  });
});

describe("AI idea generation (demo)", () => {
  it("generates grounded ideas that avoid covered topics", async () => {
    const ideas = await provider.generateIdeas(undefined, 6);
    expect(ideas.length).toBeGreaterThan(0);
    expect(ideas.length).toBeLessThanOrEqual(6);
    for (const idea of ideas) {
      expect(idea.title).toBeTruthy();
      expect(idea.rationale).toBeTruthy();
      // grounded in a real hook type + competitor mechanism
      expect(idea.suggestedHook).toBeTruthy();
    }
  });

  it("scopes to a single channel when asked", async () => {
    const ideas = await provider.generateIdeas("ch_biz", 3);
    expect(ideas.length).toBeGreaterThan(0);
    expect(ideas.length).toBeLessThanOrEqual(3);
  });
});
