# Costcompass user guide

Costcompass helps you keep track of what your household (and, if you want, your business) spends. You enter your regular costs and your one-off purchases, and Costcompass shows what they add up to. Written for: people using the app, no technical knowledge needed.

Developers: see [app structure](app-structure.md).

## Two kinds of cost

| Kind | Examples | How it is counted |
| --- | --- | --- |
| Recurring | Rent, insurance, subscriptions | Repeats every month, quarter or year |
| Purchase | A washing machine, a laptop | Counts once, on the day you bought it |

Every cost has a name, an amount in euros, and a category: Housing, Insurance, Appliances, Food or Mobility. You can also mark a cost as Business, so Costcompass can show household and business costs apart.

## Add a cost

1. Select **Add cost** in the sidebar. (The round plus button does the same on a phone.)
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

The Dashboard (**Dashboard** in the sidebar) gives you the overview. It has these parts, from top to bottom:

- **This month**: the total for the current month, a comparison with the month before (for example "50% more than September"), the two parts **Recurring** and **Purchases** with their amounts. The two parts show cents (for example €819.99), the total shows whole euros, so the parts can differ from the total by a few cents. A part without costs shows €0.00. The card is blue with white text. In a month without costs it says so and has an **Add cost** button. At the end of the card is a link such as **View March 2026**. It opens the month page of the current month, whichever year you selected, also when the month has no costs.
- **Largest this month**: the four biggest costs of the current month, largest first, each with its category icon, name, a "Business" badge where it applies, a short description such as "Housing · Monthly" or "Appliances · 8 Nov", and the amount. Each cost sits on its own soft grey row. Without costs it says "No costs this month yet." For the full list, use the **View** link in the "This month" card.
- **Your year**: the heading "Your year 2026" with the **Year** select to its right. Choose which year to look at. The list contains the current year and every year in which you bought something. If the year you chose has no purchases any more (for example because you deleted the last one), Costcompass shows the current year instead. The year changes this section and everything below it; "This month" and "Largest this month" always show the current month. Below the heading, one card shows four values: **Annual total** ("per year"), **Average** ("per month"), **Household** and **Business** (each with "<n>% of the year"; the two percentages add up to 100).
- **Where your money goes**: every category with its icon, its amount in whole euros and, below the amount, its share of the year's costs (for example "86%"). The categories are sorted by amount, largest first, and sit in several columns on a wide screen and in one column on a phone. The percentages are whole numbers and add up to 100. A category without costs shows €0 and 0%. Above the list, one bar shows the same shares in the category colours, one segment per category. The bar is only a picture; the list has every number as text. A category without costs has no segment.
- **Household and business**: a ring that shows how the year splits between household (blue) and business (orange), with the household percentage in the middle. Beside it, two rows give the amount for **Household** and for **Business**. A screen reader reads both percentages from the ring. Without costs the ring is grey and shows 0%.
- **Month by month**: twelve bars, one per month, for the selected year. The hint "Select a month to open it" sits next to the heading. The current month is a solid blue bar, the other months are light blue. A short amount stands above each bar: whole euros below 1,000 ("800"), from 1,000 up in thousands with a "k" and at most one decimal ("2.3k", "2k" for exactly 2,000; German: "2,3k"). A month without costs shows "0". The current month's amount and name are bold as well (only when you look at the current year), so you can find it without relying on colour.

Amounts on the Dashboard are rounded to whole euros. The Costs page and the month page show cents. Because of the rounding, household plus business can differ from the total by one euro on the Dashboard.

While your costs load, the Dashboard shows grey placeholder blocks that pulse softly (they stand still if your device is set to reduce motion). They disappear when the numbers arrive, and the page can shift a little at that moment. A screen reader announces "Loading your costs…" once and ignores the blocks.

If your costs cannot be loaded, you see a card with "Could not load your costs.", the text "Your data has not changed. Check your connection and try again." and a **Try again** button. Select the button to load the costs again. If you have not added anything yet, you see a card with "No costs yet", the text "Add a recurring cost or a purchase to see your totals here." and an **Add your first cost** button. The button opens the form to add a cost. Below it, a tip suggests starting with something monthly, like rent.

**Good to know:** recurring costs have no start or end date yet. When you look at a past year, Costcompass shows your current recurring costs for that year too.

### Open a month from the dashboard

Each of the twelve bars in "Month by month" is a link. Select a bar (or tab to it and press Enter) to open the month page of that month in the selected year. Select 2025 in the year list, then the bar "March", and you get March 2025. If a bar shows no height, the month has no costs; the link still works. On a narrow screen the chart scrolls sideways, so every bar stays wide enough to tap.

Screen readers read each bar as a link with the month and the full amount, for example "March: €1,100"; the short amount above the bar is not read, so nothing is said twice. With the keyboard, the focused bar gets an outline.

## Look at one month

The month page lists everything that falls in one month, with the month's total. It has its own address, for example `/months/2026/03` for March 2026. You can bookmark it and use the browser's back button.

You reach the month page from the Dashboard (the "View" link in the "This month" card or a bar in "Month by month"). It is not in the sidebar, except **This month**. You can also type the address in the browser. The month is always two digits: `/months/2026/03` works, `/months/2026/3` shows "Page not found".

On the page you see:

- The month and year as heading, with a "This month" label if it is the current month.
- Links to the previous and the next month, and a **Dashboard** link above the heading. A link is missing if it would lead to a year without any data.
- A blue card with "Total for <month>" and a comparison with the month before, for example "46% more than September" (on a phone the shorter "46% more"). On a wider screen it also counts the month's costs, for example "5 costs · 2 business". In a month without costs the card shows only the total.
- Two groups, **Recurring** and **Purchases**, each with its subtotal. Each row starts with a round icon in the colour of its category. Next to it you see the name, a "Business" label where it applies, and below the category with the interval or the date, for example "Housing · Monthly", "Insurance · Yearly, November" (a yearly cost names the month it is due) or "Appliances · October 20". The amount with cents is on the right.
- **By category**: every category that has a cost in this month, with its icon, its name and its amount with cents, the largest first. Categories without a cost in the month are not listed. Together the amounts make up the month's total. On a wide screen the card sits to the right of the groups; on a phone it comes after them. A month without costs has no **By category** card.
- For a month without costs: "No costs in <month>" and an **Add cost** button (it also pre-fills the month).
- To add a cost to this month, use **Add cost** in the sidebar or the round plus button on a phone. The date of a new purchase is pre-filled with the first day of that month and limited to it.

If the month cannot be loaded you see "Couldn't load the costs of <month>" and "Your data has not changed. Please try again." with a **Try again** button.

If you open a month in a year that has no data and is not the current year, or a month outside 01 to 12, you see "That month doesn't exist" with a link to the current month and a **Back to dashboard** button.

## Find your way around

On a wide screen (about 1024 pixels or more) the sidebar on the left holds the app name, the **Add cost** button, the links to **Dashboard**, **Costs** and **This month**, and the language list at the bottom.

On a narrower screen, such as a phone, the sidebar is replaced by a tab bar that floats above the bottom edge of the screen. It has three tabs: **Dashboard**, **Costs** and **Month** (today's month). The tab for the page you are on is filled with colour and the others are plain, so you can tell them apart. Tap a tab to go there.

Next to the tab bar sits a round button with a plus sign. Tap it to add a cost, on any page. On a month page it adds the cost to that month: a purchase starts on the first day of the month and its date is limited to that month. While the add or edit window is open the button is hidden, and it comes back when you close the window.

On a narrow screen the language button sits at the top right of the page. It shows the code of the current language, for example **EN**. It scrolls away with the page.

## Change the language

On a wide screen use the language list at the bottom of the sidebar. On a narrow screen select the round button at the top right (**EN** or **DE**) and choose **English** or **Deutsch** in the menu. The current language is ticked. The page changes at once and Costcompass remembers your choice. On your first visit it uses your browser's language, or English if it does not support yours.

## Use it with a keyboard or screen reader

Every field has a label, and page changes are announced with the new page title. Bars and charts always come with the numbers as text, so no information depends on colour.
