# West Bengal Job Portal

একটি job-aggregator ওয়েবসাইট — বিভিন্ন সোর্স (সরকারি/বেসরকারি জব সাইট) থেকে চাকরির তথ্য একত্র করে দেখায়, প্রতিটি লিস্টিং-এ **অফিসিয়াল আবেদন লিঙ্ক** সহ। এই সাইট নিজে কোনো ব্যবহারকারীর ব্যক্তিগত তথ্য সংগ্রহ করে না — candidate রা সরাসরি আসল/official ওয়েবসাইটে গিয়ে আবেদন করে।

## চালানোর নিয়ম (Local)

```bash
npm install
node server.js
```

তারপর ব্রাউজারে যাও: `http://localhost:3000`

**Admin panel:** `http://localhost:3000/admin/login`
- Username: `admin`
- Password: `admin123`

⚠️ **প্রথমেই পাসওয়ার্ড বদলে নাও।** `db.json` ফাইলে `admin.passwordHash` আপডেট করতে হবে (নিচে দেখো)।

## পাসওয়ার্ড বদলানো

```bash
node -e "const bcrypt=require('bcryptjs'); console.log(bcrypt.hashSync('তোমার-নতুন-পাসওয়ার্ড', 10));"
```
এই hash টা `db.json` এর `admin.passwordHash` ফিল্ডে বসিয়ে দাও।

## Auto-scrape সোর্স যোগ করা

Admin dashboard থেকে "নতুন সোর্স যোগ করো" ফর্মে যেকোনো job listing সাইটের নাম, URL ও জেলা দিয়ে সোর্স যোগ করতে পারবে। "🔄 এখনই Scrape চালাও" বাটনে ক্লিক করলে সব active সোর্স থেকে তথ্য fetch করার চেষ্টা হবে।

### গুরুত্বপূর্ণ: প্রতিটা সাইটের জন্য scraper কাস্টমাইজ করতে হবে

প্রতিটা ওয়েবসাইটের HTML structure আলাদা, তাই একটা generic scraper সব জায়গায় ঠিকমতো কাজ নাও করতে পারে। `scraper.js` ফাইলে `customParsers` অবজেক্টে প্রতিটা সোর্সের জন্য আলাদা parsing logic লেখা যায় (উদাহরণ কমেন্ট করা আছে ফাইলের মধ্যে)। যখন কোনো নতুন সোর্স যোগ করবে, সেই সাইটের HTML দেখে (browser DevTools → "Inspect") উপযুক্ত selector বসিয়ে দাও।

### লিগ্যাল/নৈতিক বিষয়

- **শুধু publicly available তথ্য** scrape করো, এবং **সবসময় আসল/official সোর্সের নাম ও লিঙ্ক** প্রদর্শন করো (এই কোডে ইতিমধ্যে করা আছে) — যাতে ব্যবহারকারী জানে তথ্য কোথা থেকে এসেছে এবং কোথায় গিয়ে আবেদন করতে হবে।
- **কোনো সরকারি সংস্থা বা পুলিশের নাম/লোগো ব্যবহার কোরো না** যদি না তুমি officially সেই সংস্থার অনুমোদিত হও। এই সাইট নিজেকে "West Bengal Job Portal" — একটা independent aggregator হিসেবে দেখায়, কোনো নির্দিষ্ট সরকারি বিভাগের নাম নিয়ে নয়।
- **candidate-দের personal data (bio-data, phone, address ইত্যাদি) এই সাইটে সংগ্রহ কোরো না** — সেটা impersonation/phishing এর ঝুঁকি তৈরি করে। বরং candidate-দের সরাসরি আসল কোম্পানি/সরকারি সাইটে পাঠিয়ে দাও (এই কোড তাই করে)।
- অনেক ওয়েবসাইটের Terms of Service এ scraping নিষেধ থাকতে পারে — সোর্স যোগ করার আগে সেটা যাচাই করে নিও। সম্ভব হলে ওই সাইটের public API বা RSS feed ব্যবহার করাই ভালো।

## Deploy করা (production)

এই sandbox environment-এ বাইরের যেকোনো ওয়েবসাইট scrape করা যায় না (network restricted), তাই scraper এখানে শুধু demo/placeholder data দেখাচ্ছে। **তোমার নিজের সার্ভারে/hosting এ deploy করলে** (Render, Railway, DigitalOcean, বা যেকোনো VPS — যেখানে normal internet access আছে), scraper আসল সাইট থেকে ডেটা টানতে পারবে (site-specific parser লেখার পর)।

Deploy করার আগে:
1. `SESSION_SECRET` env variable সেট করে `server.js` এ session secret বদলাও (এখন hardcoded আছে — production এ ঠিক করে নিও)
2. Admin password বদলাও
3. HTTPS ব্যবহার করো
4. `db.json` এর বদলে production এ real database (PostgreSQL/MySQL) ব্যবহার করার কথা ভাবতে পারো, যদি ডেটা বড় হয়

## ফাইল স্ট্রাকচার

```
server.js          - Express app, সব রুট (public + admin)
scraper.js          - Job data fetch/scrape logic
db.json             - Data store (jobs, sources, admin credentials)
views/              - EJS templates
public/css/         - Styling
```
