// Copyright (c) 2026 FlyByWire Simulations
// SPDX-License-Identifier: GPL-3.0

export enum A380XCustomNormalChecklistType {
  COCKPIT_PREP = 'COCKPIT_PREPARATION',
  BEFORE_START = 'BEFORE_START',
  AFTER_START = 'AFTER_START',
  TAXI_BEFORE_TAKEOFF = 'TAXI_BEFORE_TAKEOFF',
  LINE_UP = 'LINE_UP',
  DEPARTURE_CHANGE = 'DEPARTURE_CHANGE',
  AFTER_TAKEOFF = 'AFTER_TAKEOFF',
  DESCENT = 'DESCENT',
  APPROACH = 'APPROACH',
  LANDING = 'LANDING',
  AFTER_LANDING = 'AFTER_LANDING',
  PARKING = 'PARKING',
  SECURE = 'SECURE',
}

export const MAX_NUMBER_CHECKLISTS = Object.keys(A380XCustomNormalChecklistType).length;
export const MAX_NUMBER_CHECKLIST_ITEMS = 20;

export enum A380XCustomChecklistSensedItemType {
  SIGNS_ON = 'SIGNS_ON',
  SIGNS_ON_OR_AUTO = 'SIGNS_ON_OR_AUTO',
  SIGNS_OFF = 'SIGNS_OFF',
  SEATBELTS_ON = 'SEATBELTS_ON',
  SEATBELTS_OFF = 'SEATBELTS_OFF',
  SPOILERS_DISARMED = 'SPOILERS_DISARMED',
  SPOILERS_ARMED = 'SPOILERS_ARMED',
  FLAPS_TO = 'FLAPS_TO',
  FLAPS_LDG = 'FLAPS_LDG',
  FLAPS_RETRACTED = 'FLAPS_RETRACTED',
  AUTOBRAKE_RTO = 'AUTOBRAKE_RTO',
  FUEL_PUMPS_OFF = 'FUEL_PUMPS_OFF',
  ADIRS_NAV = 'ADIRS_NAV',
  BEACON_ON = 'BEACON_ON',
  RUDDER_TRIM_NEUTRAL = 'RUDDER_TRIM_NEUTRAL',
  ECAM_STS_NORMAL = 'ECAM_STATUS_NORMAL',
  ECAM_STS_NOT_NORMAL = 'ECAM_STATUS_NOT_NORMAL',
  APU_START = 'APU_START',
  APU_BLEED_OFF = 'APU_BLEED_OFF',
  APU_MASTER_OFF = 'APU_MASTER_OFF',
  PACKS_ON = 'PACKS_ON',
  EMER_EXIT_LIGHTS_OFF = 'EMERGENCY_EXIT_LIGHTS_OFF',
  OXYGEN_OFF = 'OXYGEN_OFF',
  ENGINES_OFF = 'ENGINES_OFF',
  GEAR_UP = 'GEAR_UP',
  GEAR_DOWN = 'GEAR_DOWN',
}

export enum A380xCustomChecklistItemType {
  LINE_SEPARATOR = 'LINE',
  ACTION = 'ACTION',
  HEADLINE = 'HEADLINE',
}

export interface A380xCustomNormalChecklistItem {
  type: A380xCustomChecklistItemType;
}

/**
 * An item rendered as a under line in the checklist. Used for BELOW THE LINE cases for example.
 */
export interface A380XCustomChecklistLineSeparator extends A380xCustomNormalChecklistItem {
  type: A380xCustomChecklistItemType.LINE_SEPARATOR;
}

/**
 * An item representing a headline for a group. For example LDG for the landing checklist memo. Rendered with an underline.
 */
export interface A380XCustomChecklistHeadline extends A380xCustomNormalChecklistItem {
  /** The name of the item, e.g. LDG */
  name: string;

  type: A380xCustomChecklistItemType.HEADLINE;
}

/**
 * An item representing an action in the checklist to be performed by the crew.
 */
export interface A380XCustomChecklistItemAction extends A380xCustomNormalChecklistItem {
  /** The name of the item, e.g. SIGNS */
  name: string;
  /** The label when the item is not completed */
  labelNotCompleted: string;

  /** The label when the item is completed. If not specified, it will default to the same as labelNotCompleted */
  labelCompleted?: string;

  // TODO implement:
  /** If specified, the item will be hidden unless the sensed condition is true. */
  visibleWhen?: A380XCustomChecklistSensedItemType;
  /** If specified, the item will be automatically sensed against the condition */
  sensed?: A380XCustomChecklistSensedItemType;
  /** If true, the item will be shifted to the left */
  subLevel: boolean;

  /** If true, a colon will be displayed after the item's label when it is completed.*/
  colonIfCompleted: boolean;
}

/** The definition of a custom normal checklist, containing it's title, the items and the type */
export interface A380XCustomNormalChecklist {
  /** The title of the checklist, e.g LANDING */
  title: string;

  /** The items of the checklist */
  items: A380xCustomNormalChecklistItem[];

  /** The type of the checklist */
  type: A380XCustomNormalChecklistType;
}

export interface A380XCustomEcamDefinition {
  /** Whether to display the TO/LDG memo with SIGNS ON instead of SEAT BELTS ON */
  toldgMemoSignsOn: boolean;

  /** The normal checklists for the aircraft */
  normalChecklists?: A380XCustomNormalChecklist[];
}

export function isActionItem(item: A380xCustomNormalChecklistItem): item is A380XCustomChecklistItemAction {
  return item.type === A380xCustomChecklistItemType.ACTION;
}

export function isLineSeparatorItem(item: A380xCustomNormalChecklistItem): item is A380XCustomChecklistLineSeparator {
  return item.type === A380xCustomChecklistItemType.LINE_SEPARATOR;
}

export function isHeadlineItem(item: A380xCustomNormalChecklistItem): item is A380XCustomChecklistHeadline {
  return item.type === A380xCustomChecklistItemType.HEADLINE;
}
