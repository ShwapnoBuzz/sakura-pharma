Sakura Pharma (সাকুরা ফার্মা) — Offline Pharmacy Software v1.2
Open: double-click index.html in Chrome/Edge  (or run start_server.bat / start_server.sh, then open http://localhost:8765 and Install)
Language: বাংলা / English switch at the top right of every screen (remembered on this device; Bengali is the default).
Guides: ব্যবহার_নির্দেশিকা.md / .pdf (Bengali) · User_Guide_English.md / .pdf (English)
Data is stored in the browser (IndexedDB) on this device only. Take a daily backup from Settings.
Sample data (নমুনা) prices are NOT real. Use DGDA-approved MRP and supplier invoice prices.
New in 1.1: Bengali/English interface, medicine search by Bengali name, sale return / cancel (restocks and adjusts dues).
Third-party: SheetJS (Apache-2.0, lib/SHEETJS_LICENSE.txt), Hind Siliguri font (SIL OFL).
New in 1.2: optional full Bangladesh medicine database (24,718 items) — Settings → "সম্পূর্ণ বাংলাদেশ ওষুধ ডাটাবেস লোড করুন" (or "BD ডাটাবেস" on the Medicines page). Chunked import with progress bar; imported items start at stock 0; sample data stays separate; fast indexed search.
Database source: BDDrugBank v1.0.0, Zenodo 20749707 (https://zenodo.org/records/20749707), derived from medex.com.bd, Sep 2025 snapshot, CC-BY-4.0 as labelled. MedEx terms of use allow personal, non-commercial use only; the shop owner chose to use it knowing this risk. Do not redistribute data/bd_medicines.js.
Database prices: MRP is from the Sep 2025 source; purchase/wholesale prices are ESTIMATES (marked আনুমানিক). Verify against DGDA and supplier invoices before selling.
Public (GitHub) code build: the medicine data file is NOT included. Use Settings → "সম্পূর্ণ বাংলাদেশ ওষুধ ডাটাবেস লোড করুন" and choose bd_medicines.json (or bd_medicines.js) from the shop computer. The full local zip includes data/bd_medicines.js and loads it automatically. .gitignore keeps data/bd_medicines.* out of git.
