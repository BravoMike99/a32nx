// Copyright (c) 2024-2026 FlyByWire Simulations
// SPDX-License-Identifier: GPL-3.0

import {
  ChecklistAction,
  ChecklistLineStyle,
  NormalProcedure,
  NormalProcedureType,
} from '../../../../instruments/src/MsfsAvionicsCommon/EcamMessages';

export const LINE_SEPARATOR_CHECKLIST_ITEM: ChecklistAction = {
  name: '',
  style: ChecklistLineStyle.SeparationLine,
  labelNotCompleted: '',
  sensed: true,
};

/** All normal procedures (checklists, via ECL) should be here.
 * Display is ordered by type value, ascending. */
export const EcamNormalProcedures: NormalProcedure[] = [
  {
    title: 'COCKPIT PREPARATION',
    items: [
      {
        name: 'GEAR PINS & COVERS',
        labelNotCompleted: 'REMOVED',
        sensed: false,
      },
      {
        name: 'FUEL QUANTITY',
        labelNotCompleted: '____ KG',
        sensed: false,
      },
      {
        name: 'SEAT BELTS',
        labelNotCompleted: 'ON',
        colonIfCompleted: false,
        sensed: true,
      },
      {
        name: 'BARO REF',
        labelNotCompleted: '____ (BOTH)',
        sensed: false,
      },
    ],
    type: NormalProcedureType.COCKPIT_PREPARATION,
  },
  {
    title: 'BEFORE START',
    items: [
      {
        name: 'PARKING BRAKE',
        labelNotCompleted: '____',
        sensed: false,
      },
      {
        name: 'T.O SPEEDS & THRUST',
        labelNotCompleted: '____ (BOTH)',
        sensed: false,
      },
      {
        name: 'BEACON',
        labelNotCompleted: 'ON',
        colonIfCompleted: false,
        sensed: true,
      },
    ],
    type: NormalProcedureType.BEFORE_START,
  },
  {
    title: 'AFTER START',
    items: [
      {
        name: 'ANTI ICE',
        labelNotCompleted: '____',
        sensed: false,
      },
      {
        name: 'PITCH TRIM',
        labelNotCompleted: 'T.O',
        sensed: false,
      },
      {
        name: 'RUDDER TRIM',
        labelNotCompleted: 'NEUTRAL',
        sensed: true,
      },
    ],
    type: NormalProcedureType.AFTER_START,
  },
  {
    title: 'TAXI',
    items: [
      {
        name: 'FLIGHT CONTROLS',
        labelNotCompleted: 'CHECKED (BOTH)',
        sensed: false,
      },
      {
        name: 'FLAPS SETTING',
        labelNotCompleted: 'CONF ____ (BOTH)',
        sensed: false,
      },
      {
        name: 'RADAR',
        labelNotCompleted: 'ON',
        sensed: false,
      },
      {
        name: 'T.O',
        style: ChecklistLineStyle.SubHeadline,
        sensed: true,
      },
      {
        name: 'SEAT BELTS',
        labelNotCompleted: 'ON',
        colonIfCompleted: false,
        sensed: true,
        level: 1,
      },
      {
        name: 'GND SPLRs',
        labelNotCompleted: 'ARM',
        colonIfCompleted: false,
        sensed: true,
        level: 1,
      },
      {
        name: 'FLAPS',
        labelNotCompleted: 'T.O',
        sensed: true,
        level: 1,
      },
      {
        name: 'AUTO BRK',
        labelNotCompleted: 'RTO',
        colonIfCompleted: false,
        sensed: true,
        level: 1,
      },
      {
        name: 'T.O CONFIG',
        labelNotCompleted: 'TEST',
        labelCompleted: 'NORM',
        colonIfCompleted: false,
        sensed: true,
        level: 1,
      },
    ],
    type: NormalProcedureType.TAXI_BEFORE_TAKEOFF,
  },
  {
    title: 'LINE-UP',
    items: [
      {
        name: 'T.O RWY',
        labelNotCompleted: '____ (BOTH)',
        sensed: false,
      },
      {
        name: 'PACK 1 & 2',
        labelNotCompleted: 'ON',
        sensed: false,
      },
    ],
    type: NormalProcedureType.LINE_UP,
  },
  {
    title: '<<DEPARTURE CHANGE>>',
    items: [
      {
        name: 'RWY & SID',
        labelNotCompleted: '____',
        sensed: false,
      },
      {
        name: 'FLAPS SETTING',
        labelNotCompleted: 'CONF ____ (BOTH)',
        sensed: false,
      },
      {
        name: 'T.O SPEEDS & THRUST',
        labelNotCompleted: '____ (BOTH)',
        sensed: false,
      },
      {
        name: 'FCU ALT',
        labelNotCompleted: '____',
        sensed: false,
      },
    ],
    type: NormalProcedureType.DEPARTURE_CHANGE,
  },
  {
    title: 'ALL PHASES : DEFERRED PROCEDURE',
    items: [],
    type: NormalProcedureType.ALL_PHASES_DEFERRED_PROCEDURE,
  },
  {
    title: 'AT TOP OF DESCENT : DEFERRED PROCEDURE',
    items: [],
    type: NormalProcedureType.BEFORE_TOD_DEFERRED_PROCEDURE,
  },
  {
    title: 'FOR APPROACH : DEFERRED PROCEDURE',
    items: [],
    type: NormalProcedureType.BEFORE_APPROACH_DEFERRED_PROCEDURE,
  },
  {
    title: 'APPROACH',
    items: [
      {
        name: 'BARO REF',
        labelNotCompleted: '____ (BOTH)',
        sensed: false,
      },
      {
        name: 'SEAT BELTS',
        labelNotCompleted: 'ON',
        colonIfCompleted: false,
        sensed: true,
      },
      {
        name: 'MINIMUM',
        labelNotCompleted: '____',
        sensed: false,
      },
      {
        name: 'AUTO BRAKE',
        labelNotCompleted: '____',
        sensed: false,
      },
    ],
    type: NormalProcedureType.APPROACH,
  },
  {
    title: 'FOR LANDING : DEFERRED PROCEDURE',
    items: [],
    type: NormalProcedureType.BEFORE_LANDING_DEFERRED_PROCEDURE,
  },
  {
    title: 'LANDING',
    items: [
      { name: 'LDG', style: ChecklistLineStyle.SubHeadline, sensed: true },
      {
        name: 'SEAT BELTS',
        labelNotCompleted: 'ON',
        colonIfCompleted: false,
        sensed: true,
      },
      {
        name: 'LDG GEAR',
        labelNotCompleted: 'DOWN',
        colonIfCompleted: false,
        sensed: true,
      },
      {
        name: 'GND SPLRs',
        labelNotCompleted: 'ARM',
        colonIfCompleted: false,
        sensed: true,
      },
      {
        name: 'FLAPS',
        labelNotCompleted: 'LDG',
        sensed: true,
      },
    ],
    type: NormalProcedureType.LANDING,
  },
  {
    title: 'PARKING',
    items: [
      {
        name: 'PARKING BRAKE OR CHOCKS',
        labelNotCompleted: 'SET',
        sensed: false,
      },
      {
        name: 'ENGINES',
        labelNotCompleted: 'OFF',
        colonIfCompleted: false,
        sensed: true,
      },
      {
        name: 'WING LIGHTS',
        labelNotCompleted: 'OFF',
        sensed: false,
      },
      {
        name: 'FUEL PUMPs',
        labelNotCompleted: 'OFF',
        colonIfCompleted: false,
        sensed: true,
      },
    ],
    type: NormalProcedureType.PARKING,
  },
  {
    title: 'SECURING THE AIRCRAFT',
    items: [
      {
        name: 'OXYGEN',
        labelNotCompleted: 'OFF',
        colonIfCompleted: false,
        sensed: true,
      },
      {
        name: 'EMER EXIT LIGHT',
        labelNotCompleted: 'OFF',
        colonIfCompleted: false,
        sensed: true,
      },
      {
        name: 'EFBs',
        labelNotCompleted: 'OFF',
        sensed: false,
      },
      {
        name: 'BATTERIES',
        labelNotCompleted: 'OFF',
        sensed: false,
      },
    ],
    type: NormalProcedureType.SECURE,
  },
];
