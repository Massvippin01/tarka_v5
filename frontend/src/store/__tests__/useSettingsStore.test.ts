import { describe, it, expect, beforeEach } from "vitest";
import {
  useSettingsStore,
  hasPermission,
  DEFAULT_WEIGHTS,
} from "../useSettingsStore";
import { DICTIONARY } from "../../i18n/translations";

describe("Settings Store & Permissions (Prompt F-5)", () => {
  beforeEach(() => {
    useSettingsStore.getState().resetAllSettings();
  });

  it("initializes with default investigator role and station settings", () => {
    const state = useSettingsStore.getState();
    expect(state.profile.role).toBe("INVESTIGATOR");
    expect(state.station.stationName).toBe("Noida Cyber Crime PS, UP");
    expect(state.appearance.language).toBe("en");
    expect(state.ai.scoringWeights).toEqual(DEFAULT_WEIGHTS);
  });

  it("enforces strict role-based permission boundaries", () => {
    // Investigator cannot archive cases or edit algorithm weights
    expect(hasPermission("INVESTIGATOR", "archive")).toBe(false);
    expect(hasPermission("INVESTIGATOR", "reassign")).toBe(false);
    expect(hasPermission("INVESTIGATOR", "editWeights")).toBe(false);
    expect(hasPermission("INVESTIGATOR", "actOnFreeze")).toBe(true);

    // Supervisor can archive and reassign, but cannot edit weights
    expect(hasPermission("SUPERVISOR", "archive")).toBe(true);
    expect(hasPermission("SUPERVISOR", "reassign")).toBe(true);
    expect(hasPermission("SUPERVISOR", "editWeights")).toBe(false);

    // Administrator has full permissions
    expect(hasPermission("ADMIN", "archive")).toBe(true);
    expect(hasPermission("ADMIN", "reassign")).toBe(true);
    expect(hasPermission("ADMIN", "editWeights")).toBe(true);
    expect(hasPermission("ADMIN", "resetDemo")).toBe(true);
  });

  it("updates station letterhead and verifies persistent state mutation", () => {
    useSettingsStore.getState().updateStation({
      stationName: "Special Cell Cyber Command, New Delhi",
      district: "New Delhi",
      state: "Delhi NCT",
      letterheadTitle: "DELHI POLICE SPECIAL CELL",
    });

    const state = useSettingsStore.getState();
    expect(state.station.stationName).toBe("Special Cell Cyber Command, New Delhi");
    expect(state.station.letterheadTitle).toBe("DELHI POLICE SPECIAL CELL");
    expect(state.station.state).toBe("Delhi NCT");
  });

  it("allows updating scoring weights and cleanly resetting to defaults", () => {
    useSettingsStore.getState().updateScoringWeights({
      velocity: 0.50,
      fanOut: 0.20,
    });

    expect(useSettingsStore.getState().ai.scoringWeights.velocity).toBe(0.50);
    expect(useSettingsStore.getState().ai.scoringWeights.fanOut).toBe(0.20);

    useSettingsStore.getState().resetWeightsToDefault();
    expect(useSettingsStore.getState().ai.scoringWeights).toEqual(DEFAULT_WEIGHTS);
  });

  it("translates key UI labels between English and Hindi", () => {
    expect(DICTIONARY.en["nav.settings"]).toBe("Settings & Administration");
    expect(DICTIONARY.hi["nav.settings"]).toBe("सेटिंग्स एवं प्रशासन");

    expect(DICTIONARY.en["role.investigator"]).toBe("Frontline Investigator");
    expect(DICTIONARY.hi["role.investigator"]).toBe("जांच अधिकारी (IO)");

    expect(DICTIONARY.en["metric.frozen"]).toBe("Secured Debit Lien (§107)");
    expect(DICTIONARY.hi["metric.frozen"]).toBe("फ्रीज की गई राशि (§107)");
  });
});

