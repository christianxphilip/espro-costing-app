# Event Expenses Feature Guide

## Overview

You can now track event-based expenses (like a 2-day booth event) that automatically adjust your COGS only during the event period.

## How Event Expenses Work

Event expenses are temporary expenses that:
- Only affect COGS during the event period
- Automatically activate on the start date
- Automatically deactivate after the event duration ends
- Are allocated per-item based on expected daily sales

## Example: 2-Day Event Booth

**Scenario:**
- Event: Coffee Festival Booth
- Total Cost: ₱5,000
- Start Date: December 1, 2024
- Duration: 2 days
- Expected Daily Sales: 100 items

**Calculation:**
- Daily allocation: ₱5,000 ÷ 2 days = ₱2,500/day
- Per-item cost during event: ₱2,500 ÷ 100 items = ₱25/item
- This ₱25/item is added to COGS on Dec 1-2, 2024 only

After Dec 2, the expense automatically stops affecting COGS.

## Creating an Event Expense

### Via API

```javascript
POST /api/expenses
{
  "name": "Coffee Festival Booth",
  "amount": 5000,
  "frequency": "event",
  "category": "Events",
  "eventStartDate": "2024-12-01",
  "eventDurationDays": 2,
  "notes": "2-day festival booth setup and rental"
}
```

### Required Fields for Events

- `name`: Event name
- `amount`: Total expense amount
- `frequency`: Must be `"event"`
- `category`: Expense category
- `eventStartDate`: Start date (ISO format: "YYYY-MM-DD")
- `eventDurationDays`: Number of days (minimum 1)

## Automatic Behavior

1. **Before Event**: Expense is active but `getDailyAmount()` returns 0 (not affecting COGS)
2. **During Event**: Expense contributes to daily costs based on duration
3. **After Event**: Expense stops contributing (returns 0 again)

## Recalculation

When you:
- Create/update/delete any expense
- Update settings (expected daily sales)
- Manually trigger recalculation: `POST /api/expenses/recalculate`

The system will automatically:
- Check which events are currently active
- Include only active events in COGS calculations
- Adjust all item COGS accordingly

## Tips

1. **Plan Ahead**: Create event expenses before the event starts
2. **Check Dates**: Verify event dates are correct
3. **Monitor**: Events automatically stop affecting COGS after the end date
4. **Multiple Events**: You can have multiple active events at the same time

## Example Use Cases

- **Festival Booth**: 2-3 day events
- **Pop-up Shop**: Week-long temporary locations
- **Special Promotions**: Limited-time marketing expenses
- **Equipment Rental**: Short-term equipment for events

## API Response Example

When creating an event expense, you'll see:

```json
{
  "success": true,
  "data": {
    "_id": "...",
    "name": "Coffee Festival Booth",
    "amount": 5000,
    "frequency": "event",
    "eventStartDate": "2024-12-01T00:00:00.000Z",
    "eventDurationDays": 2,
    "category": "Events",
    "isActive": true,
    ...
  }
}
```

The expense will automatically affect COGS starting on the event start date!

