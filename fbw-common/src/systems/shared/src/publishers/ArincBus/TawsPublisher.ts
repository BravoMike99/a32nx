// Copyright (c) 2024-2026 FlyByWire Simulations
// SPDX-License-Identifier: GPL-3.0

/* eslint-disable camelcase */

import {
  EventBus,
  IndexedEventType,
  PublishPacer,
  SimVarPublisher,
  SimVarPublisherEntry,
  SimVarValueType,
} from '@microsoft/msfs-sdk';

interface BaseTawsEvents {
  /**
   * The first discrete word of the EGPWS alert information. Raw ARINC Word.
   * Bit(s)   | Meaning
   *  11 | Sink Rate Warning
   *  12 | Pull Up Warning
   *  13 | Terrain Warning
   *  14 | Don't sink warning
   *  15 | Too low gear warning
   *  16 | Too low flaps warning
   *  17 | Too low terrain warning
   *  18 | Glide slope warning
   */
  egpws_alert_discrete_word_1: number;
  /**
   * The second discrete word of the EGPWS alert information. Raw ARINC Word.
   * * Bit(s)   | Meaning
   *  11    | Glide Slope Warning
   *  12  | GPWS Alert
   *  13  | GPWS Warning
   */
  egpws_alert_discrete_word_2: number;
}

/**
 * Indexed events related to TAWS (Terrain Awareness and Warning System) information.
 */
type TawsIndexedEvents = {
  [P in keyof BaseTawsEvents as IndexedEventType<P>]: BaseTawsEvents[P];
};

export interface TawsDataEvents extends BaseTawsEvents, TawsIndexedEvents {}

export class TawsPublisher extends SimVarPublisher<TawsDataEvents> {
  /**
   * Creates a TawsPublisher.
   * @param bus The event bus to which to publish.
   * @param pacer An optional pacer to use to control the rate of publishing.
   */
  public constructor(bus: EventBus, pacer?: PublishPacer<TawsDataEvents>) {
    const simvars = new Map<keyof TawsDataEvents, SimVarPublisherEntry<any>>([
      [
        'egpws_alert_discrete_word_1',
        { name: 'L:A32NX_EGPWS_ALERT_#index#_DISCRETE_WORD_1', type: SimVarValueType.Enum, indexed: true },
      ],
      [
        'egpws_alert_discrete_word_2',
        { name: 'L:A32NX_EGPWS_ALERT_#index#_DISCRETE_WORD_2', type: SimVarValueType.Enum, indexed: true },
      ],
    ]);
    super(simvars, bus, pacer);
  }
}
