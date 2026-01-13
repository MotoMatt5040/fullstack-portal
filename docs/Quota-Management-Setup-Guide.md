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

## Troubleshooting

### Quotas Not Appearing
1. Check that the project name matches the expected pattern
2. Verify the Criterion field has valid syntax
3. Ensure STYPE values are 1-6

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
