// Copyright (c) 2026 FlyByWire Simulations
// SPDX-License-Identifier: GPL-3.0

export enum A380XNormalChecklistFlightPhase {
  BEFORE_TAKEOFF,
  DEPARTURE_CHANGE,
  DESCENT,
  APPROACH,
  LANDING,
  AFTER_LANDING,
}

export enum A380XNormalChecklistSensedItem {
  SIGNS_ON,
  SIGNS_ON_OR_AUTO,
  SIGNS_OFF,
  SEATBELTS_ON,
  SEATBELTS_OFF,
  SPOILERS_DISARMED,
  SPOILERS_ARMED,
  FLAPS_TO,
  FLAPS_LDG,
  FLAPS_RETRACTED,
  AUTOBRAKE_RTO,
  FUEL_PUMPS_OFF,
  ADIRS_NAV,
  BEACON_ON,
  RUDDER_TRIM_NEUTRAL,
  ECAM_STS_NORMAL,
  ECAM_STS_NOT_NORMAL,
  APU_START,
  APU_BLEED_OFF,
  APU_MASTER_OFF,
  PACKS_ON,
  EMER_EXIT_LIGHTS_OFF,
  OXYGEN_OFF,
  ENGINES_OFF,
}

export enum A380xNormalChecklistItemType {
  MEMO,
  ACTION,
}

export enum A380XNormalChecklistMemoType {
  TO,
  LDG,
}

export interface A380xNormalChecklistItem {
  type: A380xNormalChecklistItemType;
}

export interface A380XNormalChecklistDefinitionItemMemo extends A380xNormalChecklistItem {
  type: A380xNormalChecklistItemType.MEMO;
  memoType: A380XNormalChecklistMemoType;
}

export interface A380XNormalChecklistDefinitionItemAction extends A380xNormalChecklistItem {
  name: string;
  labelNotCompleted: string;
  labelCompleted: string;
  visibleWhen?: A380XNormalChecklistSensedItem;
  sensedItem?: A380XNormalChecklistSensedItem;
  type: A380xNormalChecklistItemType.ACTION;
}

export interface A380XNormalChecklistDefinition {
  title: string;

  items: A380xNormalChecklistItem[];

  flightPhase: A380XNormalChecklistFlightPhase;
}

export interface A380XCustomEcamDefinition {
  /** Whether to display the TO/LDG memo with SIGNS ON instead of SEAT BELTS ON */
  toldgMemoSignsOn?: boolean;

  /** Whether to display the GND SPLRs as SPLRs in the T.O and LDG MEMOs */
  memoGndSplrsAsSplrs?: boolean;

  /** Whether to spell the TO config normal as "NORMAL" instead of "NORM" */
  toMemoConfigNormAsNormal?: boolean;

  /** The normal checklists for the aircraft */
  normalChecklists: A380XNormalChecklistDefinition[];
}
