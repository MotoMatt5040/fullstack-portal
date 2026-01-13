# Quota Management Setup Guide

This guide explains how to properly configure quotas in Voxco so they display correctly in the Quota Management portal.

---

## Overview

The Quota Management system pulls data from two sources:
- **Phone Quotas**: From Voxco's strata/quota system (Landline and Cell projects)
- **Web Quotas**: From A4Survey web projects (Panel, T2W, Email, Mailer)

The system uses the **Criterion** field in Voxco to determine how quotas are grouped and categorized.

---

## Project Naming Conventions

The system identifies project types by their name suffix:

| Suffix | Type | Example |
|--------|------|---------|
| `C` | Cell | `25001C` |
| `COM` | Combined (internal) | `25001COM` |
| *(none)* | Landline | `25001` |

**Important**: Projects ending in `COM` are processed first and contain internal-only data.

---

## STYPE Values (Sample Types)

Quotas are categorized by STYPE in the Criterion field:

| STYPE | Type | Category |
|-------|------|----------|
| 1 | Landline | Phone |
| 2 | Cell | Phone |
| 3 | Panel | Web |
| 4 | T2W (Text-to-Web) | Web |
| 5 | Email | Web |
| 6 | Mailer | Web |

---

## Criterion Field Setup

The **Criterion** field is the key to proper quota mapping. Here's how to structure it:

### Basic Format
```
VARIABLE=VALUE
```

### Multiple Conditions
```
VARIABLE1=VALUE1 AND VARIABLE2=VALUE2
```

### Adding STYPE to Quotas
To specify which sample type a quota belongs to, append `AND STYPE=X`:

```
REGION=1 AND STYPE=1        # Landline quota for Region 1
REGION=1 AND STYPE=2        # Cell quota for Region 1
AGE=1 AND STYPE=3           # Panel quota for Age group 1
```

### VTYPE for Internal Quotas
Add `AND VTYPE=1` for quotas that should only appear internally:

```
REGION=1 AND VTYPE=1        # Internal-only quota
```

---

## Label Field Setup

The **Label** field controls display and total objectives.

### Including Total Objectives
Add the total objective in parentheses at the end of the label:

```
Region: Northeast (T:500)    # Total objective of 500
Age: 18-34 (MIN:100)         # Minimum of 100
Gender: Male (MAX:200)       # Maximum of 200
Region: South (250)          # Simple total of 250
```

The system extracts the last number in parentheses as the `TotalObjective`.

### Excluding Rows from Calculations
Add `*` to exclude a row from status calculations:

```
*Tracker Row (100)           # Won't affect Open/Closed status
```

### Hiding from External Users
Add `!` to hide a row from external users:

```
!Internal Tracking (50)      # Only visible to internal users
```

---

## Quota Grouping Logic

### How Quotas Are Grouped

1. **Same Criterion (minus STYPE/VTYPE)** = Same row in the table
2. **Different STYPE values** = Different columns within that row

**Example**: These three quotas will appear as ONE row with three columns:

| Criterion | Label | Result |
|-----------|-------|--------|
| `REGION=1 AND STYPE=1` | Northeast (100) | Landline column |
| `REGION=1 AND STYPE=2` | Northeast (100) | Cell column |
| `REGION=1 AND STYPE=3` | Northeast (50) | Panel column |

### Phone vs Web Separation

- STYPE 1-2 appear under **Phone** section
- STYPE 3-6 appear under **Web** section

---

## Total Row Setup

The total row is calculated from quotas with criterion `STYPE>0` or individual `STYPE=X` entries.

To properly populate totals:
1. Create a quota with criterion `STYPE=1` for Landline totals
2. Create a quota with criterion `STYPE=2` for Cell totals
3. For web: Create quotas with `STYPE=3`, `STYPE=4`, etc.

---

## Status Mapping

Quota statuses are mapped as follows:

| Voxco Status | Portal Display |
|--------------|----------------|
| 0 or "Open" | O (Open) |
| 1 or "Half Open" | H (Half Open) |
| 2 or "Closed" | C (Closed) |

**Auto-calculated Status**: The Total column status is automatically calculated:
- **Open (O)**: If `TotalObjective - Frequency > 0`
- **Closed (C)**: If quota is met or `TotalObjective = 0`

---

## Complete Example

### Voxco Quota Setup

| Label | Criterion | Quota | Status |
|-------|-----------|-------|--------|
| Total Landline (T:500) | STYPE=1 | 500 | Open |
| Total Cell (T:300) | STYPE=2 | 300 | Open |
| Northeast (T:200) | REGION=1 AND STYPE=1 | 100 | Open |
| Northeast (T:200) | REGION=1 AND STYPE=2 | 100 | Open |
| Southeast (T:200) | REGION=2 AND STYPE=1 | 100 | Open |
| Southeast (T:200) | REGION=2 AND STYPE=2 | 100 | Open |
| !Tracking (50) | TRACKER=1 AND VTYPE=1 | 50 | Open |

### Portal Display Result

| Label | Total Obj | Total Freq | Landline | Cell |
|-------|-----------|------------|----------|------|
| **Total** | 800 | - | - | - |
| Northeast | 200 | - | 100 | 100 |
| Southeast | 200 | - | 100 | 100 |

*(Tracking row hidden from external users)*

---

## Criteria That Cause Quotas to be Skipped

The system has several conditions that will cause quotas to be **completely skipped** during processing. Understanding these is critical to ensure your quotas appear correctly.

### Summary Table: What Gets Skipped

| Condition | Where Skipped | Effect |
|-----------|---------------|--------|
| `STYPE>2` in criterion | Web processing | Quota ignored entirely |
| `TFLAG` in criterion | Web processing | Quota ignored entirely |
| `STYPE=1` or `STYPE=2` in web project | Web processing | Quota ignored (phone types in web) |
| `STYPE=3,4,5,6` in phone project | Phone processing | Quota ignored (web types in phone) |
| `STYPE>0` criterion | External users only | Row removed from display |
| `!` in label | External users only | Row removed from display |
| Non-`com` rows when `com` data exists | External users only | Rows without `com` data removed |

---

### 1. STYPE>2 (Web Processing)

**What it means**: Matches all records where STYPE is greater than 2 (Panel, T2W, Email, Mailer)

**What happens**: Quotas with `STYPE>2` in their criterion are **completely skipped**.

```javascript
// From the code:
if (Criterion.includes('STYPE>2') || Criterion.includes('TFLAG')) {
  continue;  // Skip this quota entirely
}
```

**Example that WON'T appear**:
```
Criterion: REGION=1 AND STYPE>2
Label: Northeast Web (100)
```

**How to fix**: Use specific STYPE values instead:

| Instead of... | Use... |
|---------------|--------|
| `REGION=1 AND STYPE>2` | `REGION=1 AND STYPE=3` (Panel) |
| | `REGION=1 AND STYPE=4` (T2W) |
| | `REGION=1 AND STYPE=5` (Email) |

---

### 2. TFLAG (Web Processing)

**What it means**: Internal tracking flag criterion

**What happens**: Any criterion containing `TFLAG` is skipped entirely.

**Example that WON'T appear**:
```
Criterion: TFLAG=1
Label: Tracking Flag (50)
```

**Why**: TFLAG is used for internal dialer tracking and shouldn't appear in quota reports.

---

### 3. Phone STYPEs in Web Projects (STYPE=1 or STYPE=2)

**What happens**: When processing web project quotas, any quota with `STYPE=1` (Landline) or `STYPE=2` (Cell) is skipped.

```javascript
// From the code:
if (stypeId === '1' || stypeId === '2') {
  continue;  // Skip phone types in web projects
}
```

**Why**: Phone quotas belong in phone projects, not web projects. This prevents double-counting.

---

### 4. Web STYPEs in Phone Projects (STYPE=3,4,5,6)

**What happens**: When processing phone project quotas, any quota with Panel, T2W, Email, or Mailer STYPE is skipped.

```javascript
// From the code:
const webTypes = ['Panel', 'T2W', 'Email', 'Mailer'];
if (webTypes.includes(subType)) {
  continue;  // Skip web types in phone projects
}
```

**Why**: Web quotas belong in web projects, not phone projects.

---

### 5. STYPE>0 Tracker Row (External Users Only)

**What happens**: For external users, any row with criterion `STYPE>0` is removed.

```javascript
// From the code:
const trackerKey = Object.keys(data).find((key) => key === 'STYPE>0');
if (trackerKey) {
  delete data[trackerKey];
}
```

**Why**: `STYPE>0` is typically used as an overall tracker row that shouldn't be visible to clients.

**Note**: Internal users will still see this row.

---

### 6. Exclamation Mark in Label (External Users Only)

**What happens**: For external users, any row where the label contains `!` is removed.

```javascript
// From the code:
if (label.includes('!')) {
  shouldRemoveRow = true;
}
```

**Example**:
```
Label: !Internal Tracking (50)
```

**Why**: The `!` prefix is a convention to mark internal-only quotas.

**Note**: Internal users will still see these rows.

---

### 7. COM Data Filtering (External Users Only)

**What happens**: If ANY quota has data in the `com` column (from projects ending in "COM"), then for external users, ALL rows that DON'T have `com` data are removed.

```javascript
// From the code:
const hasComData = quotaKeys.some(quotaKey => {
  const quotaData = data[quotaKey];
  return quotaData?.Phone?.com || quotaData?.Web?.com;
});

if (hasComData) {
  const rowHasComData = data[quotaKey]?.Phone?.com || data[quotaKey]?.Web?.com;
  if (!rowHasComData) {
    shouldRemoveRow = true;
  }
}
```

**Why**: COM projects are typically used for combined/client-facing data. If COM data exists, external users should only see those specific quotas.

**Important**: This is an all-or-nothing filter. If you have COM data for some quotas, make sure ALL quotas you want external users to see have corresponding COM entries.

---

### 8. Projects Excluded by Name Pattern

**What happens**: Phone projects with `WOE` in the name are excluded from queries entirely.

```sql
-- From ProjectInfoServices.js:
WHERE name NOT LIKE '%WOE%'
```

**Why**: WOE (Work Order Entry or similar) projects are typically test or administrative projects.

---

## Visual Summary: Processing Flow

```
PHONE PROJECT QUOTAS
├── STYPE=3,4,5,6 (web types) → SKIPPED
└── STYPE=1,2 or no STYPE → PROCESSED
    └── Grouped by criterion (minus STYPE/VTYPE)

WEB PROJECT QUOTAS
├── Contains 'STYPE>2' → SKIPPED
├── Contains 'TFLAG' → SKIPPED
├── STYPE=1 or STYPE=2 → SKIPPED
└── STYPE=3,4,5,6 or no STYPE → PROCESSED
    └── Grouped by criterion (minus STYPE/VTYPE)

EXTERNAL USER FILTERING (after processing)
├── Criterion = 'STYPE>0' → REMOVED
├── Label contains '!' → REMOVED
└── If COM data exists anywhere:
    └── Rows without COM data → REMOVED
```

---

## Troubleshooting

### Quotas Not Appearing
1. Check that the project name matches the expected pattern (no `WOE` in name)
2. Verify the Criterion field has valid syntax
3. Ensure STYPE values are 1-6
4. **Check for skip conditions**:
   - Does the criterion contain `STYPE>2`? Use specific values instead
   - Does the criterion contain `TFLAG`? This is always skipped
   - Is a phone STYPE (1,2) in a web project? Move to phone project
   - Is a web STYPE (3,4,5,6) in a phone project? Move to web project

### Quotas Not Appearing for External Users
1. Does the label contain `!`? Remove it for external visibility
2. Is the criterion `STYPE>0`? This is hidden from external users
3. Do you have COM project data? If so, ensure the quota has COM data too

### Wrong Column Placement
- Verify the STYPE value in the Criterion matches the intended type
- Check for typos in `STYPE=X` syntax

### Missing Totals
- Ensure you have quotas with criterion `STYPE=1`, `STYPE=2`, etc.
- Check that the Label includes a total objective in parentheses

### Rows Not Combining
- The base Criterion (without STYPE/VTYPE) must be exactly the same
- Example: `REGION=1` must match `REGION=1`, not `Region=1`

---

## Quick Reference

| Goal | How To |
|------|--------|
| Set total objective | Add `(T:XXX)` or `(XXX)` to Label |
| Assign to Landline | Add `AND STYPE=1` to Criterion |
| Assign to Cell | Add `AND STYPE=2` to Criterion |
| Assign to Panel | Add `AND STYPE=3` to Criterion |
| Hide from external | Add `!` to start of Label |
| Exclude from calcs | Add `*` to start of Label |
| Internal-only quota | Add `AND VTYPE=1` to Criterion |
