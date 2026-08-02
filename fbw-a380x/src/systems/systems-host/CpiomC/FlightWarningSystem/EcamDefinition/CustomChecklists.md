# Custom ECAM Checklist Configuration

The A380X supports customization of the ECAM Normal Checklists through the `panel.xml` configuration file.

To enable custom checklists, create an `<EcamDefinition>` element inside the root `<PanelHtmlConfig>` element.

```xml
<PanelHtmlConfig>
    <EcamDefinition>
        ...
    </EcamDefinition>
</PanelHtmlConfig>
```

## XML Structure

The overall structure of the ECAM customization is shown below.

```text
PanelHtmlConfig
└── EcamDefinition
    ├── toldgMemoSignsOn
    └── NormalChecklists
        ├── Checklist
        │   ├── Title
        │   ├── Type
        │   └── Items
        │       ├── Item
        │       ├── Item
        │       └── ...
        └── Checklist
```

## Value Types

The following value types are referenced throughout this document.

| Type | Description |
|------|-------------|
| **Boolean** | `true`, `yes`, `1`, `false`, `no`, or `0`. |
| **Text** | Any valid XML character data. XML reserved characters (such as `<`, `>`, and `&`) must be escaped. |

---

## ECAM Definition

The following elements are supported inside `<EcamDefinition>`.

### `toldgMemoSignsOn`

```xml
<toldgMemoSignsOn>true</toldgMemoSignsOn>
```

Controls whether the TAKEOFF and LANDING memos display **SIGNS ON** instead of **SEATBELTS ON**.

| Property | Value |
|----------|-------|
| Required | No |
| Default | `false` |
| Allowed Values | Boolean |

---

## Normal Checklists

Custom checklists are declared inside the `<NormalChecklists>` element.

```xml
<NormalChecklists>
    <Checklist>
        ...
    </Checklist>
</NormalChecklists>
```

Each `<Checklist>` represents a single ECAM checklist.

---

## Checklist

Each checklist consists of the following elements.

### `Title`

```xml
<Title>COCKPIT PREPARATION</Title>
```

The title displayed on the ECAM.

Each checklist title must be unique within the configuration.

| Property | Value |
|----------|-------|
| Required | Yes |
| Allowed Values | Text |

---

### `Type`

```xml
<Type>COCKPIT_PREPARATION</Type>
```

Defines the checklist type. This value is used internally for automatic reset based on flight phase and checklist ordering.

Each checklist type must be unique within the configuration.

#### Allowed Values (ordered by display order on the ECAM)

| Value |
|-------|
| `COCKPIT_PREPARATION` |
| `BEFORE_START` |
| `AFTER_START` |
| `TAXI_BEFORE_TAKEOFF` |
| `LINE_UP` |
| `DEPARTURE_CHANGE` |
| `AFTER_TAKEOFF` |
| `DESCENT` |
| `APPROACH` |
| `LANDING` |
| `AFTER_LANDING` |
| `PARKING` |
| `SECURE` |

> **Note:** `DEPARTURE_CHANGE` is a special checklist type. It is automatically hidden after takeoff and is always reset once completed.

---

### `Items`

Contains the checklist entries.

```xml
<Items>
    <Item>
        ...
    </Item>
</Items>
```

Each checklist must contain at least one item.

Three item types are supported:

- `ACTION`
- `HEADLINE`
- `LINE`

---

## ACTION Item

An `ACTION` item represents a checklist action that may either be manually completed or automatically sensed by the aircraft. Items may also be conditionally hidden based on an aircraft state.

```xml
<Item>
    <Type>ACTION</Type>
    <Name>T.O CONFIG</Name>
    <LabelNotCompleted>TEST</LabelNotCompleted>
    <LabelCompleted>NORM</LabelCompleted>
    <Condition>TO_CONFIG_NORMAL</Condition>
    <VisibilityCondition>GEAR_UP</VisibilityCondition>
    <SubLevel>true</SubLevel>
    <ColonIfCompleted>false</ColonIfCompleted>
</Item>
```

### Elements

| Element | Required | Description | Allowed Values |
|---------|:--------:|-------------|----------------|
| `Type` | Yes | Must be `ACTION`. | `ACTION` |
| `Name` | Yes | Description displayed on the left side of the checklist item. | Text |
| `LabelNotCompleted` | Yes | Text displayed while the item is incomplete. | Text |
| `LabelCompleted` | No | Text displayed after completion. If omitted, `LabelNotCompleted` remains visible. | Text |
| `Condition` | No | Sensed condition used for automatic completion. Defaults to no condition. | See [Sensed Conditions](#sensed-conditions). |
| `VisibilityCondition` | No | Hides the item whenever the specified condition evaluates to `true`. Defaults to always visible. | See [Sensed Conditions](#sensed-conditions). |
| `SubLevel` | No | Displays the item indented beneath the previous item. Defaults to `false`. | Boolean |
| `ColonIfCompleted` | No | Appends a colon after the completed label. Defaults to `true`. | Boolean |

---

## HEADLINE Item

A `HEADLINE` item displays underlined text and is commonly used as a section heading (for example **T.O** or **LDG**).

```xml
<Item>
    <Type>HEADLINE</Type>
    <Name>T.O</Name>
</Item>
```

### Elements

| Element | Required | Description | Allowed Values |
|---------|:--------:|-------------|----------------|
| `Type` | Yes | Must be `HEADLINE`. | `HEADLINE` |
| `Name` | Yes | Text displayed as the headline. | Text |

---

## LINE Item

A `LINE` item displays a horizontal separator.

```xml
<Item>
    <Type>LINE</Type>
</Item>
```

A `LINE` item only requires the `Type` element with the value `LINE`. Any additional elements are ignored.

---

## Sensed Conditions

The following values are supported by both the `Condition` and `VisibilityCondition` elements.

| Condition | Description |
|------------|-------------|
| `SIGNS_ON` | SEATBELTS and NO MOBILE signs are in AUTO or ON. |
| `SIGNS_OFF` | SEATBELTS and NO MOBILE signs are OFF. |
| `SEATBELTS_ON` | Seatbelt signs ON. |
| `SPOILERS_DISARMED` | Speed brake lever retracted and spoilers not extended. |
| `SPOILERS_ARMED` | Ground spoilers armed. |
| `FLAPS_TO` | Flaps in the takeoff position. |
| `FLAPS_LDG` | Flaps in the landing position. |
| `FLAPS_RETRACTED` | Flaps lever at position 0. |
| `AUTOBRAKE_RTO` | Autobrake set to RTO. |
| `FUEL_PUMPS_OFF` | All fuel pump pushbuttons OFF. |
| `ADIRS_NAV` | All three ADIRS in NAV. |
| `BEACON_ON` | Beacon switch ON. |
| `RUDDER_TRIM_NEUTRAL` | Rudder trim neutral. |
| `ECAM_STS_NORMAL` | ECAM STATUS normal. |
| `ECAM_STS_NOT_NORMAL` | ECAM STATUS not normal. |
| `APU_START` | APU START pushbutton ON. |
| `APU_BLEED_OFF` | APU BLEED pushbutton OFF. |
| `APU_MASTER_ON` | APU MASTER pushbutton ON. |
| `PACKS_ON` | PACK 1 and PACK 2 pushbuttons in AUTO. |
| `EMER_EXIT_LIGHTS_OFF` | Emergency exit lights OFF. |
| `OXYGEN_OFF` | Crew oxygen supply OFF. |
| `GEAR_UP` | Landing gear selected UP. |
| `GEAR_DOWN` | Landing gear selected DOWN and all gears downlocked. |

---

## Complete Example

```xml
<PanelHtmlConfig>
    <EcamDefinition>
        <toldgMemoSignsOn>true</toldgMemoSignsOn>

        <NormalChecklists>
            <Checklist>
                <Title>My Custom Checklist</Title>
                <Type>COCKPIT_PREPARATION</Type>

                <Items>
                    <Item>
                        <Type>HEADLINE</Type>
                        <Name>HELLO</Name>
                    </Item>

                    <Item>
                        <Type>ACTION</Type>
                        <Name>MY CUSTOM ACTION</Name>
                        <LabelNotCompleted>ACTION</LabelNotCompleted>
                    </Item>

                    <Item>
                        <Type>ACTION</Type>
                        <Name>SEAT BELTS</Name>
                        <LabelNotCompleted>ON</LabelNotCompleted>
                        <Condition>SEATBELTS_ON</Condition>
                        <VisibilityCondition>ADIRS_NAV</VisibilityCondition>
                        <ColonIfCompleted>false</ColonIfCompleted>
                    </Item>
                </Items>
            </Checklist>
        </NormalChecklists>
    </EcamDefinition>
</PanelHtmlConfig>
```

---

## Validation Rules

The following constraints apply to custom checklist definitions:

1. A maximum of **13** checklists may be defined.
2. Each checklist `Type` must be unique.
3. Each checklist `Title` must be unique.
4. If `<NormalChecklists>` is present, it must contain at least one `<Checklist>`.
5. Each checklist must contain at least **1** item and no more than **20** items.

---

## Invalid Configurations

If the XML is invalid or any validation rule is violated, the configuration will be rejected, as such:

1. The ECAM displays the **AIRLINE CUSTOMIZATION REJECTED** message during preflight.
2. The default ECAM checklists are used.
3. SIGNS ON option is ignored and SEATBELTS ON will be used for the takeoff and landing memos.

The specific reason for the rejection can be found in the EFB troubleshooting page.
