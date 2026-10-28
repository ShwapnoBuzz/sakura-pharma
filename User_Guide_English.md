# Sakura Pharma Software — User Guide (English)

**Sakura Pharma — Model Medicine Shop**, Malibag Mor, Bakshiganj, Jamalpur · 01333-884455
*Quality medicine, humane service*

Version 1.1 · Works without internet · No server, no monthly fee · Bengali and English (বাংলা নির্দেশিকা: `ব্যবহার_নির্দেশিকা.pdf`)

---

## 1. What the software does

| Menu | What it does |
|---|---|
| Dashboard | Today's sales and profit, stock value, dues, a 14-day chart and alerts |
| Sale (POS) | Find medicines (English or Bengali name) and sell, see alternative brands, retail or wholesale price, discount, credit, print receipts, returns/cancellations |
| Medicines | Add, edit and delete medicines; Excel import/export |
| Purchase / Stock-in | Enter batch, expiry, quantity and cost from supplier invoices |
| Home delivery | Track orders: New → Ready → On the way → Delivered |
| Dues ledger | Customer dues and supplier payables, receive payments, transaction history |
| Stock alerts | Expired medicines, expiring in 30/60/90 days, low stock, order list |
| Interactions | View and edit drug interactions and side effects (ADR) |
| Reports | Sales, profit, top sellers, stock value and dues for any date range |
| Backup & Settings | Backup, restore, shop details, PIN and users, delete sample data |

---

## 2. Switching language: বাংলা / English

* Every screen (including the PIN lock screen) has a **বাংলা | English** switch at the top right. One click changes the whole software — menus, buttons, messages, reports, receipts (80 mm and A4), delivery statuses and interaction warnings. Numbers and dates follow the language too.
* The choice is remembered on this device. Bengali is the default.
* Medicine names, customer/supplier names and notes you type are kept exactly as entered; they are not translated.
* What the English receipt prints for the shop name and address can be changed in *Backup & Settings → Shop details → English text*.

---

## 3. Running on a computer (Windows)

**Simple way (recommended):**
1. Unzip `sakura_pharma_app.zip` into a permanent folder such as `D:\SakuraPharma` (not Downloads).
2. Right-click `index.html` → **Open with → Google Chrome** (or Microsoft Edge).
3. Bookmark the page or make a desktop shortcut.
4. Always open it **in the same browser and from the same folder**. Data is stored inside the browser, so another browser or folder will not show it.

**Install like an app (optional):**
1. If Python is installed, double-click `start_server.bat`. Chrome opens `http://localhost:8765`.
2. Click the **Install (⊕)** icon at the right of the address bar. A "Sakura Pharma" app icon is created.
3. Note: opening from `index.html` and from `localhost` are two separate places for the browser, so their data is separate. Pick one and stick with it. To move, take a backup first and restore it in the new place.

**Printer:** install the 80 mm thermal printer driver. In the print dialog choose the printer, set Margins to **None** and turn **Headers and footers** off. For a normal printer use "A4 print".

---

## 4. Android phone or tablet

* **Best:** if the software is hosted at an http(s) address (for example your own GitHub Pages or Netlify account), open it in Chrome on the phone and choose ⋮ → **Add to Home screen / Install app**. It then works offline.
* **On the same Wi-Fi:** keep `start_server.bat` running on the computer and open `http://<computer-IP>:8765` on the phone (browser use only; installing usually needs https).
* Phone and computer data are **separate and do not sync**. Keep one main device in the shop and move data with a backup file.

---

## 5. First-day setup

1. **Delete the sample data.** The software starts with 49 **sample** medicines, sales and customers. Their prices are not real. After trying it out, use *Backup & Settings → Delete all sample data* (or "Delete sample sales/stock/customers" to keep only the medicine names).
2. **Enter shop details** — name, address, phone and receipt footer (Bengali and English).
3. **Add medicines** one by one (*Medicines → New medicine*) or in bulk (*Medicines → Excel/CSV import → Blank template (Excel)*, fill it, import it). The file has 5 sheets: Medicines, Prices, Interactions, ADR, Suppliers. The optional `brand_name_bn` column holds the Bengali name for searching.
4. **Enter real prices.** Take MRP from **DGDA-approved prices** or the company price list, and cost/wholesale prices from **supplier invoices**. Note the source in the Prices sheet `source` column.
5. **Enter stock** on *Purchase / Stock-in*: supplier, invoice number, and each medicine's batch, expiry, quantity and cost. Any unpaid amount goes to the supplier's ledger automatically.

---

## 6. Making a sale (2–3 clicks)

1. Press **New sale** at the top, or **F2**.
2. Type the first few letters of the brand or generic name — in English (`napa`, `parace`) or Bengali (`নাপা`, `সেকলো`). Alternative brands of the same generic are listed below. Pick with ↑ ↓ and press **Enter**.
3. Change quantity with **+ / −**.
4. Press **Complete sale** (or **F9**), then **Print receipt**.

| Key | Action |
|---|---|
| F2 | Go to medicine search |
| ↑ ↓ / Enter | Pick from the list and add to cart |
| F4 | Switch retail / wholesale price |
| F8 | Discount |
| F9 or Ctrl+Enter | Complete sale |
| Esc | Close search or dialog |

* **Credit sale:** enter less in "Paid" and the rest goes to the customer's ledger (name and mobile are required).
* **Home delivery:** tick "Home delivery" and enter the address and delivery charge; the order moves to the *Home delivery* page.
* Stock is sold **earliest expiry first** (FEFO). Expired batches cannot be sold.
* **Bengali search:** sample medicines already have Bengali names. For your own medicines, fill *Medicines → Edit → Bengali name*. Without a Bengali name the software tries a sound-alike match (e.g. `সার্জেল` → Sergel), which is approximate.

### Returns and cancelling a sale

1. Open the receipt: *Recent sales* on the Dashboard or *Reports → Sales list* → **Receipt**.
2. Press **↩ Return / Cancel** (owner only).
3. Enter the quantity coming back for each medicine, or press **Return all (cancel whole sale)**. Add a reason and press **Save return**.
4. The software then:
   * puts the medicines back into stock (into the batch they were sold from),
   * deducts the refund from the customer's due first and tells you how much cash to give back,
   * shows "Goods returned" and "Net sale" on the receipt, or a "CANCELLED SALE" stamp for a full cancel,
   * cancels a pending home-delivery order for that sale.
5. Cancelling an order on the Home delivery page offers to cancel the sale and restock as well.
6. Reports subtract refunds from the **original sale date** (not the date of the return).

---

## 7. Interactions and side effects

* When two medicines in the cart can be harmful together, a red or yellow warning appears (e.g. Warfarin + Diclofenac). For **Severe** ones you must confirm again before selling.
* Medicines the patient already takes can be typed in "Other medicines the patient takes?" and are checked too.
* The list is a **small starter list** summarised from FDA labels, BNF and EMA/MHRA. It is **supporting information only**, not a substitute for a pharmacist's or doctor's judgement, and has not been reviewed by a pharmacist. No warning does not mean safe. Have a pharmacist review and extend it on the *Interactions* page.

---

## 8. Backup (very important)

All data lives only in this computer's or phone's browser. "Clear browsing data", reinstalling Windows or a broken device **can lose the data**.

* **Every day before closing**, press *Backup & Settings → Download backup*. A `sakura_pharma_backup_date_time.json` file is saved.
* Keep it on a pen drive, Google Drive or your email. Keep at least the last 7 days.
* The Dashboard reminds you if no backup was taken for 7 days.
* **Restore:** *Backup & Settings → Restore from backup*, choose the file. All current data is replaced, so be sure first.

---

## 9. PIN and users

* *Backup & Settings → PIN login & users → Add user*: add an **Owner** and **Salesperson** with a 4–6 digit PIN each, then tick "PIN login on".
* A **Salesperson** can sell, stock-in, handle deliveries and dues, but cannot see reports, profit, cost prices or settings, cannot delete medicines and cannot do returns.
* Keep the owner PIN somewhere safe. **If it is forgotten** you will need a backup restore or full reset.
* The PIN is light in-shop protection only. Also set a Windows password.

---

## 10. Troubleshooting

| Problem | Fix |
|---|---|
| Data not showing | Check you are using the same browser and the same folder/address. Otherwise restore a backup. |
| Bengali text looks broken | Make sure the `fonts` folder is next to `index.html`. |
| Receipt too long / big margins | In the print dialog set Margins to None and Scale to 100. |
| Barcode scanner | Scanners type like a keyboard. Save the code in the medicine's "Barcode" field and scan into the POS search box. |

Help: Sakura Pharma, 01333-884455
