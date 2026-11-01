# Budgetly user guide

Budgetly helps you keep track of what your household (and, if you want, your business) spends. You enter your regular costs and your one-off purchases, and Budgetly shows what they add up to. Written for: people using the app, no technical knowledge needed.

Developers: see [app structure](app-structure.md).

## Two kinds of cost

| Kind | Examples | How it is counted |
| --- | --- | --- |
| Recurring | Rent, insurance, subscriptions | Repeats every month, quarter or year |
| Purchase | A washing machine, a laptop | Counts once, on the day you bought it |

Every cost has a name, an amount in euros, and a category: Housing, Insurance, Appliances, Food or Mobility. You can also mark a cost as Business, so Budgetly can show household and business costs apart.

## Add a cost

1. Open **Costs** in the top menu and select **Add cost**. (On the Dashboard you can use the **Add cost** button in the "Add a cost" box.)
2. Under **Type**, choose Recurring or Purchase.
3. Fill in **Name**, **Amount** and **Category**. Tick **Business cost** if it belongs to your business.
4. For a purchase, pick the **Date**.
   For a recurring cost, pick the **Interval**: Monthly, Quarterly or Yearly. A yearly or quarterly cost also needs a **Due month**. A quarterly cost starts in that month and repeats every three months, so February means February, May, August and November.
5. Select **Add cost**.

The window closes and the cost appears in the table. If the cost could not be saved, a message says "Could not save the cost. Please try again." and the window stays open with what you typed.

Required fields show a message under the field if you leave them empty or enter a wrong value.

## Change or delete a cost

On the **Costs** page, each row has two buttons.

- **Pencil** ("Edit <name>"): opens the same form with the values filled in. Change what you need and select **Save**. You cannot change the type of a cost (recurring or purchase). If you need a different type, delete the cost and add a new one.
- **Trash** ("Delete <name>"): asks "Delete cost?" and tells you that the cost "will be permanently deleted". Select **Delete** to confirm or **Cancel** to keep it. A deleted cost cannot be restored.

## Read the costs table

The **Costs** page lists recurring costs and purchases together. The **When** column shows the interval and month for a recurring cost (for example "Yearly, March") and the date for a purchase.

The table is sorted by name. Select the header of Name, Category, Kind, Amount or Business to sort by it; select it again to reverse the order.

## Read the dashboard

The Dashboard (**Dashboard** in the menu) gives you the overview. It has these parts, from top to bottom:

- **This month**: the total for the current month, a comparison with the month before (for example "50% more than September"), and a list of this month's costs. Without costs it says "No costs this month yet." and offers **Add cost**.
- **Add a cost**: a shortcut to the form.
- **Year**: choose which year to look at. The list contains the current year and every year in which you bought something. This only changes the sections below it; "This month" always shows the current month.
- **Summary for the year**: four tiles with the annual total, the household part, the business part and the average per month.
- **Household versus business**: one bar and a text with both percentages.
- **Costs by category**: each category with its amount and a bar, largest first.
- **Costs per month**: twelve bars, one per month. The current month's name is bold.

Amounts on the Dashboard are rounded to whole euros. The Costs page and the month page show cents. Because of the rounding, household plus business can differ from the total by one euro on the Dashboard.

If your costs cannot be loaded, you see "Could not load your costs." with a **Try again** button. Your data has not changed. If you have not added anything yet, you see "No costs yet" and a link to the Costs page.

**Good to know:** recurring costs have no start or end date yet. When you look at a past year, Budgetly shows your current recurring costs for that year too.

## Look at one month

The month page lists everything that falls in one month, with the month's total. It has its own address, for example `/months/2026/03` for March 2026. You can bookmark it and use the browser's back button.

The month page is not linked from the Dashboard yet, and it is not in the menu. Type the address in the browser to open it. The month is always two digits: `/months/2026/03` works, `/months/2026/3` shows "Page not found".

On the page you see:

- The month and year as heading, with a "This month" label if it is the current month.
- Links to the previous and the next month, and a **Dashboard** link above the heading. A link is missing if it would lead to a year without any data.
- "Total for <month>" and two groups, **Recurring** and **Purchases**, each with its subtotal. Each row shows the name, a "Business" label where it applies, the category with the interval or the day, and the amount with cents.
- For a month without costs: "No costs in <month>" and an **Add cost** button.
- An **Add cost** button next to the heading. The date of a new purchase is pre-filled with the first day of that month and limited to it.

If the month cannot be loaded you see "Couldn't load the costs of <month>" and "Your data has not changed. Please try again." with a **Try again** button.

If you open a month in a year that has no data and is not the current year, or a month outside 01 to 12, you see "That month doesn't exist" with a link to the current month and a **Back to dashboard** button.

## Change the language

Use the language list in the top bar. English and Deutsch are available. The page changes at once and Budgetly remembers your choice. On your first visit it uses your browser's language, or English if it does not support yours.

## Use it with a keyboard or screen reader

Every field has a label, and page changes are announced with the new page title. Bars and charts always come with the numbers as text, so no information depends on colour.
