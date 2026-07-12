// Copyright (c) 2021-2026 FlyByWire Simulations
//
// SPDX-License-Identifier: GPL-3.0

import { EventBus, MappedSubject, SimVarValueType, Subscribable } from '@microsoft/msfs-sdk';
import { RegisteredSimVar } from '../../../../../../fbw-common/src/systems/shared/src';
import { FwsSoundManagerEvents } from './FwsSoundEvents';

// Synthetic voice has priority over everything, SC is least important
enum FwsAuralWarningType {
  AuralWarning,
  SyntheticVoice,
}

export enum FwsAuralVolume {
  Full, // 0 dB
  Attenuated, // -6dB
  Silent, // -200 dB
}

export enum FwsSyntheticVoiceAural {
  None = 0,
  AutobrakeOff,
  RunwayTooShort,
  KeepMaxReverse,
  SetMaxReverse,
  BrakeMaxBraking,
  V1,
  PitchPitch,
  SpeedSpeedSpeed,
  Minimums,
  HundredAbove,
  PlusHundred, // Unused
  TwoThousandFiveHundred,
  TwentyFiveHundred,
  TwoThousand,
  OneThousand,
  FiveHundred,
  FourHundred,
  FourHundredIntermediate,
  ThreeHundred,
  ThreeHundredIntermediate,
  TwoHundred,
  TwoHundredIntermediate,
  OneHundred,
  OneHundredIntermediate,
  HundredAnd,
  Ninety,
  Eighty,
  Seventy,
  Sixty,
  Fifty,
  Forty,
  Thirty,
  Twenty,
  Nineteen,
  Eighteen,
  Seventeen,
  Sixteen,
  Fifteen,
  Fourteen,
  Thirteen,
  Twelve,
  Eleven,
  Ten,
  Nine,
  Eight,
  Seven,
  Six,
  Five,
  Four,
  Three,
  Two,
  One,
  Retard,
  BankBank, // Unused
  CompanyMessage, // Unused
  CompanyAlert, // Unused
  TimeMarker, // Unused
  DoorPls, // Unused
}

interface FwsSyntheticVoice extends FwsAural {
  id: FwsSyntheticVoiceAural;

  /** If this is set, this sound is repeated for the specified number of times */
  repeatFor?: number;
}

interface FwsAuralWarning extends FwsAural {
  /** The LocalVar which triggers the playback. Not prefixed by L: here. */
  localVarName: string;

  type: FwsAuralWarningType.AuralWarning;
}

interface FwsAural {
  /** Sounds are queued based on type and priority (highest priority = gets queued first within same type) */
  priority?: number;

  /** The type of aural warning. */
  type: FwsAuralWarningType;

  /** Length of audio in seconds, if non-repetitive */
  length?: number;

  /** Whether the sound should be played continuously unless explicitly stopped. */
  continuous?: boolean;

  /** If this is set, this sound is repeated periodically with the specified pause in seconds */
  periodicWithPause?: number;

  /** If true, sound is stopped immediately once the condition is no longer valid. Only relevant for non continuous sounds. */
  breakBeforeStopping?: boolean;
}

export const FwsAuralsList: Record<string, FwsAuralWarning | FwsSyntheticVoice> = {
  continuousRepetitiveChime: {
    localVarName: 'A32NX_FWC_CRC',
    priority: 2,
    type: FwsAuralWarningType.AuralWarning,
    continuous: true,
  },
  singleChime: {
    localVarName: 'A32NX_FWC_SC',
    length: 0.54,
    priority: 5,
    type: FwsAuralWarningType.AuralWarning,
    continuous: false,
    breakBeforeStopping: true,
  },
  cavalryChargeOnce: {
    localVarName: 'A32NX_FWC_CAVALRY_CHARGE',
    length: 0.9,
    priority: 1,
    type: FwsAuralWarningType.AuralWarning,
    continuous: false,
  },
  cavalryChargeCont: {
    localVarName: 'A32NX_FWC_CAVALRY_CHARGE',
    priority: 1,
    type: FwsAuralWarningType.AuralWarning,
    continuous: true,
  },
  tripleClick: {
    localVarName: 'A32NX_FMA_TRIPLE_CLICK',
    length: 0.62,
    priority: 3,
    type: FwsAuralWarningType.AuralWarning,
    continuous: false,
  },
  cChordOnce: {
    localVarName: 'A32NX_ALT_DEVIATION',
    length: 1.0,
    priority: 4,
    type: FwsAuralWarningType.AuralWarning,
    continuous: false,
  },
  cChordCont: {
    localVarName: 'A32NX_ALT_DEVIATION',
    priority: 4,
    type: FwsAuralWarningType.AuralWarning,
    continuous: true,
  },
  v1: {
    id: FwsSyntheticVoiceAural.V1,
    length: 1.3,
    priority: 3,
    type: FwsAuralWarningType.SyntheticVoice,
    continuous: false,
  },
  runwayTooShort: {
    id: FwsSyntheticVoiceAural.RunwayTooShort,
    length: 1.6,
    priority: 1,
    type: FwsAuralWarningType.SyntheticVoice,
    continuous: true,
  },
  keepMaxReverse: {
    id: FwsSyntheticVoiceAural.KeepMaxReverse,
    length: 1.4,
    priority: 10,
    type: FwsAuralWarningType.SyntheticVoice,
    continuous: false,
  },
  autoBrakeOff: {
    id: FwsSyntheticVoiceAural.AutobrakeOff,
    length: 1.5,
    priority: 11,
    type: FwsAuralWarningType.SyntheticVoice,
    continuous: false,
  },
  setMaxReverse: {
    id: FwsSyntheticVoiceAural.SetMaxReverse,
    length: 1.62,
    priority: 9,
    type: FwsAuralWarningType.SyntheticVoice,
    continuous: false,
  },
  brakeMaxBraking: {
    id: FwsSyntheticVoiceAural.BrakeMaxBraking,
    length: 3.1,
    priority: 8,
    type: FwsAuralWarningType.SyntheticVoice,
    continuous: true,
  },
  pitchPitch: {
    id: FwsSyntheticVoiceAural.PitchPitch,
    priority: 4,
    length: 0.48,
    type: FwsAuralWarningType.SyntheticVoice,
    repeatFor: 2,
  },
  speedSpeedSpeed: {
    id: FwsSyntheticVoiceAural.SpeedSpeedSpeed,
    priority: 2,
    length: 0.56,
    repeatFor: 3,
    type: FwsAuralWarningType.SyntheticVoice,
    breakBeforeStopping: true,
  },
  // Altitude callouts
  minimums: {
    id: FwsSyntheticVoiceAural.Minimums,
    length: 0.67,
    priority: 8,
    type: FwsAuralWarningType.SyntheticVoice,
  },
  hundred_above: {
    id: FwsSyntheticVoiceAural.HundredAbove,
    length: 0.72,
    priority: 7,
    type: FwsAuralWarningType.SyntheticVoice,
  },
  retard: {
    // Workaround till we have 10/20ret audio
    id: FwsSyntheticVoiceAural.Retard,
    length: 1.1, // Add a bit of silence before new retard can play
    priority: 6,
    continuous: false,
    type: FwsAuralWarningType.SyntheticVoice,
  },
  retard_continuous: {
    id: FwsSyntheticVoiceAural.Retard,
    priority: 7,
    length: 0.72,
    type: FwsAuralWarningType.SyntheticVoice,
    continuous: false,
    periodicWithPause: 0.1,
  },
  alt_2500: {
    id: FwsSyntheticVoiceAural.TwoThousandFiveHundred,
    length: 1.1,
    priority: 28,
    type: FwsAuralWarningType.SyntheticVoice,
  },
  alt_2500b: {
    id: FwsSyntheticVoiceAural.TwentyFiveHundred,
    length: 1.047,
    priority: 27,
    type: FwsAuralWarningType.SyntheticVoice,
  },
  alt_2000: {
    id: FwsSyntheticVoiceAural.TwoThousand,
    length: 0.72,
    priority: 26,
    type: FwsAuralWarningType.SyntheticVoice,
  },
  alt_1000: {
    id: FwsSyntheticVoiceAural.OneThousand,
    length: 0.9,
    priority: 25,
    type: FwsAuralWarningType.SyntheticVoice,
  },
  alt_500: {
    id: FwsSyntheticVoiceAural.FiveHundred,
    length: 0.6,
    priority: 24,
    type: FwsAuralWarningType.SyntheticVoice,
  },
  alt_400: {
    id: FwsSyntheticVoiceAural.FourHundred,
    length: 0.6,
    priority: 23,
    type: FwsAuralWarningType.SyntheticVoice,
  },

  intermediate_400: {
    id: FwsSyntheticVoiceAural.FourHundredIntermediate,
    length: 0.28,
    type: FwsAuralWarningType.SyntheticVoice,
  },

  alt_300: {
    id: FwsSyntheticVoiceAural.ThreeHundred,
    length: 0.6,
    priority: 22,
    type: FwsAuralWarningType.SyntheticVoice,
  },

  intermediate_300: {
    id: FwsSyntheticVoiceAural.ThreeHundredIntermediate,
    length: 0.25,
    type: FwsAuralWarningType.SyntheticVoice,
  },

  alt_200: {
    id: FwsSyntheticVoiceAural.TwoHundred,
    length: 0.6,
    priority: 21,
    type: FwsAuralWarningType.SyntheticVoice,
  },

  intermediate_200: {
    id: FwsSyntheticVoiceAural.TwoHundredIntermediate,
    length: 0.22,
    type: FwsAuralWarningType.SyntheticVoice,
  },

  alt_100: {
    id: FwsSyntheticVoiceAural.OneHundred,
    length: 0.6,
    priority: 20,
    type: FwsAuralWarningType.SyntheticVoice,
  },

  intermediate_100: {
    id: FwsSyntheticVoiceAural.OneHundredIntermediate,
    length: 0.22,
    type: FwsAuralWarningType.SyntheticVoice,
  },

  hundred_and: {
    id: FwsSyntheticVoiceAural.HundredAnd,
    type: FwsAuralWarningType.SyntheticVoice,
    length: 0.44,
  },

  alt_90: {
    id: FwsSyntheticVoiceAural.Ninety,
    length: 0.4,
    priority: 19,
    type: FwsAuralWarningType.SyntheticVoice,
  },

  alt_80: {
    id: FwsSyntheticVoiceAural.Eighty,
    length: 0.39,
    priority: 18,
    type: FwsAuralWarningType.SyntheticVoice,
  },

  alt_70: {
    id: FwsSyntheticVoiceAural.Seventy,
    length: 0.4,
    priority: 17,
    type: FwsAuralWarningType.SyntheticVoice,
  },

  alt_60: {
    id: FwsSyntheticVoiceAural.Sixty,
    length: 0.4,
    priority: 16,
    type: FwsAuralWarningType.SyntheticVoice,
  },

  alt_50: {
    id: FwsSyntheticVoiceAural.Fifty,
    length: 0.4,
    priority: 15,
    type: FwsAuralWarningType.SyntheticVoice,
  },
  alt_40: {
    id: FwsSyntheticVoiceAural.Forty,
    length: 0.4,
    priority: 14,
    type: FwsAuralWarningType.SyntheticVoice,
  },
  alt_30: {
    id: FwsSyntheticVoiceAural.Thirty,
    length: 0.4,
    priority: 13,
    type: FwsAuralWarningType.SyntheticVoice,
  },
  alt_20: {
    id: FwsSyntheticVoiceAural.Twenty,
    length: 0.4,
    priority: 12,
    type: FwsAuralWarningType.SyntheticVoice,
  },

  alt_twenty_retard: {
    id: FwsSyntheticVoiceAural.Twenty, // TODO these should include 20 + retard once the audio supports it.
    length: 0.4,
    priority: 5,
    type: FwsAuralWarningType.SyntheticVoice,
  },

  alt_19: {
    id: FwsSyntheticVoiceAural.Nineteen,
    type: FwsAuralWarningType.SyntheticVoice,
    length: 0.83,
  },
  alt_18: {
    id: FwsSyntheticVoiceAural.Eighteen,
    type: FwsAuralWarningType.SyntheticVoice,
    length: 0.7,
  },

  alt_17: {
    id: FwsSyntheticVoiceAural.Seventeen,
    type: FwsAuralWarningType.SyntheticVoice,
    length: 0.81,
  },

  alt_16: {
    id: FwsSyntheticVoiceAural.Sixteen,
    type: FwsAuralWarningType.SyntheticVoice,
    length: 0.76,
  },

  alt_15: {
    id: FwsSyntheticVoiceAural.Fifteen,
    type: FwsAuralWarningType.SyntheticVoice,
    length: 0.71,
  },

  alt_14: {
    id: FwsSyntheticVoiceAural.Fourteen,
    type: FwsAuralWarningType.SyntheticVoice,
    length: 0.77,
  },

  alt_13: {
    id: FwsSyntheticVoiceAural.Thirteen,
    type: FwsAuralWarningType.SyntheticVoice,
    length: 0.73,
  },

  alt_12: {
    id: FwsSyntheticVoiceAural.Twelve,
    type: FwsAuralWarningType.SyntheticVoice,
    length: 0.58,
  },

  alt_11: {
    id: FwsSyntheticVoiceAural.Eleven,
    type: FwsAuralWarningType.SyntheticVoice,
    length: 0.66,
  },

  alt_10: {
    id: FwsSyntheticVoiceAural.Ten,
    length: 0.3,
    priority: 10,
    type: FwsAuralWarningType.SyntheticVoice,
  },

  alt_ten_retard: {
    id: FwsSyntheticVoiceAural.Ten, // TODO these should include 10 + retard once the audio supports it.
    length: 0.3,
    priority: 9,
    type: FwsAuralWarningType.SyntheticVoice,
  },

  alt_9: {
    id: FwsSyntheticVoiceAural.Nine,
    type: FwsAuralWarningType.SyntheticVoice,
    length: 0.44,
  },

  alt_8: {
    id: FwsSyntheticVoiceAural.Eight,
    type: FwsAuralWarningType.SyntheticVoice,
    length: 0.4,
  },

  alt_7: {
    id: FwsSyntheticVoiceAural.Seven,
    type: FwsAuralWarningType.SyntheticVoice,
    length: 0.54,
  },

  alt_6: {
    id: FwsSyntheticVoiceAural.Six,
    type: FwsAuralWarningType.SyntheticVoice,
    length: 0.53,
  },

  alt_5: {
    id: FwsSyntheticVoiceAural.Five,
    length: 0.3,
    priority: 11,
    type: FwsAuralWarningType.SyntheticVoice,
  },

  alt_4: {
    id: FwsSyntheticVoiceAural.Four,
    type: FwsAuralWarningType.SyntheticVoice,
    length: 0.48,
  },

  alt_3: {
    id: FwsSyntheticVoiceAural.Three,
    type: FwsAuralWarningType.SyntheticVoice,
    length: 0.44,
  },
  alt_2: {
    id: FwsSyntheticVoiceAural.Two,
    type: FwsAuralWarningType.SyntheticVoice,
    length: 0.44,
  },
  alt_1: {
    id: FwsSyntheticVoiceAural.One,
    type: FwsAuralWarningType.SyntheticVoice,
    length: 0.34,
  },
};

// FIXME Not all sounds are added to this yet (e.g. CIDS chimes), consider adding them in the future
// Also, single chimes are not filtered (in RL only once every two seconds)
export class FwsSoundManager {
  private static readonly AUDIO_SYNTHETIC_VOICE_REGISTERED_SIM_VAR = RegisteredSimVar.create(
    'L:1:A380X_FWS_AUDIO_SYNTHETIC_VOICE',
    SimVarValueType.Enum,
  );

  private readonly soundQueue = new Set<keyof typeof FwsAuralsList>();

  private singleChimesPending = 0;

  private currentSoundPlaying: keyof typeof FwsAuralsList | null = null;

  /** The sound to be repeated next cycle (only for non continuous sounds). Cannot be interrupted unless breakBeforeStopping is true */
  private repeatNextCycleSound: keyof typeof FwsAuralsList | null = null;
  /* The number of times the sound shall be repeated after the initial play  */
  private numberOfTimesToRepeatSound: number | null = null;

  /** in seconds */
  private currentSoundPlayTimeRemaining = 0;

  private soundToRepeatDelay: number | null = null;
  private soundToRepeat: keyof typeof FwsAuralsList | null = null;

  private readonly intermediateSoundKeys: string[] = [];
  private intermediatePlaying = false;
  public intermediateGenerated = false;

  private readonly audioInhibited = MappedSubject.create(
    (startUp, audioFunctionLost) => !startUp || audioFunctionLost,
    this.startupCompleted,
    this.audioFunctionLost,
  );

  private maxReversePlayed = false;

  constructor(
    private readonly bus: EventBus,
    private readonly startupCompleted: Subscribable<boolean>,
    private readonly audioFunctionLost: Subscribable<boolean>,
  ) {
    // Stop all sounds
    Object.values(FwsAuralsList).forEach((a) => {
      if (this.isAuralWarning(a)) {
        if (a.localVarName) {
          SimVar.SetSimVarValue(`L:${a.localVarName}`, SimVarValueType.Bool, false);
        }
      }
    });

    const sub = this.bus.getSubscriber<FwsSoundManagerEvents>();
    sub.on('enqueueSound').handle((s) => this.enqueueSound(s));
    sub.on('dequeueSound').handle((s) => this.dequeueSound(s));
    this.audioInhibited.sub((v) => {
      if (v) {
        this.stopCurrentSound();
        this.resetSoundVariables();
      }
    }, true);
  }

  enqueueSc() {
    this.singleChimesPending++;
  }

  dequeueAllSc() {
    this.singleChimesPending = 0;
    this.dequeueSound('singleChime');
  }

  /** Add sound to queue. Don't add if already playing */
  enqueueSound(soundKey: keyof typeof FwsAuralsList) {
    const sound = FwsAuralsList[soundKey];
    if (!sound || this.currentSoundPlaying === soundKey) {
      return;
    }

    if (sound.type === FwsAuralWarningType.SyntheticVoice || sound.type === FwsAuralWarningType.AuralWarning) {
      this.soundQueue.add(soundKey);
    }
  }

  /** Remove sound from queue, e.g. when condition doesn't apply anymore. If sound is currently playing, stops sound immediately */
  dequeueSound(soundKey: keyof typeof FwsAuralsList) {
    // Check if this sound is currently playing
    if (this.currentSoundPlaying === soundKey) {
      this.stopCurrentSound();
    }
    this.soundQueue.delete(soundKey);
  }

  private stopCurrentSound() {
    if (this.currentSoundPlaying) {
      const currentSound = FwsAuralsList[this.currentSoundPlaying];
      const isAuralWarning = this.isAuralWarning(currentSound);
      // Only continuous or breakBeforeStopping sounds can be stopped early. Otherwise, let the sound finish playing.
      if (!currentSound.continuous && !currentSound.breakBeforeStopping) {
        return;
      }
      if (isAuralWarning) {
        SimVar.SetSimVarValue(`L:${currentSound.localVarName}`, SimVarValueType.Bool, false);
      } else if (!isAuralWarning) {
        FwsSoundManager.AUDIO_SYNTHETIC_VOICE_REGISTERED_SIM_VAR.set(FwsSyntheticVoiceAural.None);
        this.setFwsSynthethicVoiceOutputs(currentSound.id, false);
      }
      this.currentSoundPlaying = null;
      this.currentSoundPlayTimeRemaining = 0;
    }
  }

  /**
   * Convenience function for FWS: If condition true and sound not already playing, add to queue. If not, dequeue sound
   * */
  handleSoundCondition(soundKey: keyof typeof FwsAuralsList, condition: boolean) {
    if (!condition) {
      this.dequeueSound(soundKey);
    } else {
      if (condition && this.currentSoundPlaying !== soundKey) {
        this.enqueueSound(soundKey);
      }
    }
  }

  /** This only has an effect on sounds defining WwiseRTPC behavior/var for volume */
  setVolume(volume: FwsAuralVolume) {
    SimVar.SetSimVarValue('L:A32NX_FWS_AUDIO_VOLUME', SimVarValueType.Enum, volume);
  }

  /** Play now, not to be called from the outside */
  private playSound(soundKey: keyof typeof FwsAuralsList) {
    const sound = FwsAuralsList[soundKey];
    if (!sound) {
      return;
    }

    const isAuralWarning = this.isAuralWarning(sound);
    if (isAuralWarning) {
      SimVar.SetSimVarValue(`L:${sound.localVarName}`, SimVarValueType.Bool, true);
    } else {
      FwsSoundManager.AUDIO_SYNTHETIC_VOICE_REGISTERED_SIM_VAR.set(sound.id);
      if (this.numberOfTimesToRepeatSound === null && !sound.continuous) {
        this.numberOfTimesToRepeatSound = sound.repeatFor ? sound.repeatFor - 1 : null; // Subtract one for subsequent plays
      }
      this.setFwsSynthethicVoiceOutputs(sound.id, true);
    }

    if (sound.periodicWithPause !== undefined) {
      this.soundToRepeat = soundKey;
      this.soundToRepeatDelay = sound.periodicWithPause;
    }

    this.currentSoundPlaying = soundKey;
    this.currentSoundPlayTimeRemaining = sound.continuous ? Infinity : sound.length!;

    this.soundQueue.delete(soundKey);
  }
  /** Find most important sound from soundQueue and play */
  private selectAndPlayMostImportantSound(deltaTime: number): keyof typeof FwsAuralsList | null {
    if (this.audioInhibited.get()) {
      return null;
    }

    let selectedSoundKey: keyof typeof FwsAuralsList | null = null;
    if (!this.intermediateGenerated) {
      if (this.soundToRepeatDelay !== null && this.soundToRepeat !== null) {
        this.soundToRepeatDelay -= deltaTime / 1_000;
        if (this.soundToRepeatDelay <= 0) {
          this.soundQueue.add(this.soundToRepeat);
          this.soundToRepeatDelay = null;
          this.soundToRepeat = null;
        }
      }

      // Logic for scheduling new sounds: Take sound from soundQueue of most important type
      // (SyntheticVoice > AuralWarning > SingleChime) with lowest priority value (highest priority), and play it
      // TODO SyntheticVoice should not be interrupted by SC/CRC

      this.soundQueue.forEach((sk) => {
        const s = FwsAuralsList[sk];
        if (
          selectedSoundKey === null ||
          s.type > FwsAuralsList[selectedSoundKey].type ||
          (s.type === FwsAuralsList[selectedSoundKey].type &&
            (s.priority ?? 0) < (FwsAuralsList[selectedSoundKey].priority ?? 0))
        ) {
          selectedSoundKey = sk;
        }
      });
    } else {
      // Intermediate audio is in progress, select the next sound for the intermediate callout.
      selectedSoundKey = this.intermediateSoundKeys[0];
      if (selectedSoundKey) {
        this.intermediatePlaying = true;
      }
    }

    if (selectedSoundKey) {
      this.playSound(selectedSoundKey);
      return selectedSoundKey;
    }

    // See if single chimes are left
    if (this.singleChimesPending) {
      this.playSound('singleChime');
      this.singleChimesPending--;
      return 'singleChime';
    }

    // Ok, nothing to play
    return null;
  }

  onUpdate(deltaTime: number) {
    if (this.audioInhibited.get()) {
      return;
    }
    // Enforce one cycle delay before repeating
    if (!this.intermediatePlaying && this.repeatNextCycleSound) {
      const soundKey = this.repeatNextCycleSound;
      this.repeatNextCycleSound = null;
      this.playSound(soundKey);
      return;
    }
    // Either wait for the current sound to finish, or schedule the next sound
    const currentSound = this.currentSoundPlaying ? FwsAuralsList[this.currentSoundPlaying] : null;
    const playingSoundKey = this.currentSoundPlaying;
    if (currentSound && this.currentSoundPlayTimeRemaining > 0) {
      if (this.currentSoundPlayTimeRemaining - deltaTime / 1_000 > 0) {
        // Wait for sound to be finished
        this.currentSoundPlayTimeRemaining -= deltaTime / 1_000;
      } else {
        // Sound finishes in this cycle
        const isAuralWarning = this.isAuralWarning(currentSound);
        if (isAuralWarning) {
          if (currentSound.localVarName) {
            SimVar.SetSimVarValue(`L:${currentSound.localVarName}`, SimVarValueType.Bool, false);
          }
        } else if (!this.intermediatePlaying) {
          FwsSoundManager.AUDIO_SYNTHETIC_VOICE_REGISTERED_SIM_VAR.set(FwsSyntheticVoiceAural.None);
          this.setFwsSynthethicVoiceOutputs(currentSound.id, false);
        }
        this.currentSoundPlaying = null;
        this.currentSoundPlayTimeRemaining = 0;

        if (this.intermediatePlaying) {
          this.intermediateSoundKeys.splice(this.intermediateSoundKeys.indexOf(playingSoundKey!), 1);
          if (this.intermediateSoundKeys.length === 0) {
            this.intermediateGenerated = false;
            this.intermediatePlaying = false;
            FwsSoundManager.AUDIO_SYNTHETIC_VOICE_REGISTERED_SIM_VAR.set(FwsSyntheticVoiceAural.None);
          } else {
            // Buffer the subsequent intermediate straight away to avoid cycle delays.
            this.selectAndPlayMostImportantSound(deltaTime);
          }
        }

        if (!this.intermediatePlaying) {
          if (!isAuralWarning) {
            // Enforce one cycle delay before repeating the sound if applicable, otherwise sim won't interrupt the sound.
            if (
              !currentSound?.continuous &&
              this.numberOfTimesToRepeatSound !== null &&
              this.numberOfTimesToRepeatSound > 0
            ) {
              this.numberOfTimesToRepeatSound--;
              this.repeatNextCycleSound = playingSoundKey;
              return;
            } else {
              this.numberOfTimesToRepeatSound = null;
              this.setFwsSynthethicVoiceOutputs(currentSound.id, false);
            }
          }
          // Interrupt if sound with higher category is present in queue and current sound is continuous
          let shouldInterrupt = false;
          let rescheduleSound: keyof typeof FwsAuralsList | null = null;
          if (currentSound?.continuous) {
            this.soundQueue.forEach((sk) => {
              const s = FwsAuralsList[sk];
              if (
                s &&
                (s.type > currentSound.type ||
                  (s.type === currentSound.type && (s.priority ?? 0) < (currentSound.priority ?? 0)))
              ) {
                shouldInterrupt = true;
              }
            });
          }

          if (shouldInterrupt) {
            if (this.currentSoundPlaying && currentSound!.continuous) {
              rescheduleSound = this.currentSoundPlaying;
              this.stopCurrentSound();
              if (rescheduleSound) {
                this.enqueueSound(rescheduleSound);
              }
            }
          }
        }
      }
    } else {
      // Play next sound
      this.selectAndPlayMostImportantSound(deltaTime);
    }
  }

  private generateIntermediateCallout(height: number | null) {
    if (height === null || height > 410 || this.intermediateGenerated) {
      return;
    }

    const heightRounded = Math.round(height);
    if (heightRounded >= 100) {
      //Round to nearest 10 foot to get the closest callout.
      this.intermediateGenerated = true;
      const tens = Math.trunc((heightRounded % 100) / 10) * 10;
      const hundredSingle = Math.trunc(heightRounded / 100);
      const calloutHeightToPlay = hundredSingle * 100 + tens;
      if (calloutHeightToPlay % 100 === 0) {
        this.intermediateSoundKeys.push(`alt_${calloutHeightToPlay}`);
      } else {
        // Build the hundred and callout.
        const hundredToPlay = Math.trunc(calloutHeightToPlay / 100) * 100;
        const tensToPlay = calloutHeightToPlay % 100;
        this.intermediateSoundKeys.push(`intermediate_${hundredToPlay}`);
        this.intermediateSoundKeys.push('hundred_and');
        this.intermediateSoundKeys.push(`alt_${tensToPlay}`);
      }
    } else {
      if (heightRounded >= 20) {
        this.intermediateGenerated = true;
        const tens = Math.trunc(heightRounded / 10) * 10;
        this.intermediateSoundKeys.push(`alt_${tens}`);
        const single = Math.trunc(heightRounded % 10);
        if (single > 0) {
          this.intermediateSoundKeys.push(`alt_${single}`);
        }
      } else if (heightRounded > 0) {
        this.intermediateGenerated = true;
        this.intermediateSoundKeys.push(`alt_${heightRounded}`);
      }
    }
  }

  private isAuralWarning(sound: FwsAural): sound is FwsAuralWarning {
    return sound.type === FwsAuralWarningType.AuralWarning;
  }

  private setFwsSynthethicVoiceOutputs(id: FwsSyntheticVoiceAural, value: boolean) {
    if (id === FwsSyntheticVoiceAural.SetMaxReverse) {
      this.maxReversePlayed = value;
    }
  }

  private resetSoundVariables() {
    this.intermediateGenerated = false;
    this.intermediateSoundKeys.length = 0;
    this.intermediatePlaying = false;
    this.soundToRepeatDelay = null;
    this.soundToRepeat = null;
    this.repeatNextCycleSound = null;
    this.numberOfTimesToRepeatSound = null;
    this.maxReversePlayed = false;
    FwsSoundManager.AUDIO_SYNTHETIC_VOICE_REGISTERED_SIM_VAR.set(FwsSyntheticVoiceAural.None);
  }

  public getMaxReversePlayed(): boolean {
    return this.maxReversePlayed;
  }
}
