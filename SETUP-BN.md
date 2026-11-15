# Al-Ferdous Quran Academy — Supabase ও Admin Dashboard সেটআপ

এই গাইডটি `admin/` প্যানেল, ওয়েবসাইটের CMS, ভর্তি/ফ্রি-ট্রায়াল আবেদন এবং ছবি আপলোড চালু করার জন্য।

## ১. Supabase প্রজেক্ট যাচাই

প্রজেক্টের Dashboard খুলুন। `js/cms-config.js` ফাইলে বর্তমানে Project URL হিসেবে `https://bjszmkibprjcdhgkljqu.supabase.co` দেওয়া আছে। আপনার Supabase প্রজেক্টের URL-এর সঙ্গে এটি হুবহু মিলতে হবে। URL আলাদা হলে ওই ফাইলের `url` মানটি আপনার Project URL দিয়ে বদলাবেন।

## ২. Database তৈরি

1. Supabase Dashboard → **SQL Editor** খুলুন।
2. প্রজেক্টের `schema.sql` ফাইলটি খুলে সম্পূর্ণ SQL কপি করুন।
3. SQL-এর একদম শেষের `alferdousquranacademy.info@gmail.com` জায়গায় আপনার Admin লগইন ইমেইল বসান। ইমেইলটি অবশ্যই সেই ইমেইল হবে যা দিয়ে Supabase Auth-এ লগইন করবেন।
4. পুরো SQL একবার Run করুন। সফল হলে `admins`, `site_content`, `content_versions`, `applications` টেবিল এবং `media` Storage bucket তৈরি হবে।

**গুরুত্বপূর্ণ:** একই SQL বারবার চালানোর আগে বুঝে নিন—এটি প্রথমবারের database setup-এর জন্য।

## ৩. Admin Auth user তৈরি

1. Supabase → **Authentication → Users → Add user → Create new user** খুলুন।
2. SQL-এ দেওয়া একই ইমেইল লিখুন এবং শক্তিশালী পাসওয়ার্ড দিন।
3. **Auto Confirm User** নির্বাচন করে user তৈরি করুন।
4. যদি SQL-এর শেষের Admin email আগে না বদলে Run করে থাকেন, SQL Editor-এ শেষের `insert into public.admins...` লাইনটি সঠিক ইমেইল দিয়ে চালান।

## ৪. Public key ওয়েবসাইটে বসান

1. Supabase → **Project Settings → API** (কিছু Dashboard-এ API Keys) খুলুন।
2. **Project URL** এবং **anon/public** অথবা **publishable** key কপি করুন।
3. প্রজেক্টের `js/cms-config.js` ফাইল খুলুন।
4. এই লাইনে আপনার তথ্য বসান:

```js
window.AF_CMS_CONFIG = {
  url: "https://bjszmkibprjcdhgkljqu.supabase.co",
  anonKey: "sb_publishable_eWa6dfD0AEozjWKqImsgEw_Xl3qEjCC"
};
```

`anon`/`publishable` key ব্রাউজারে ব্যবহারের জন্য। **কখনো `service_role` বা secret key এখানে বসাবেন না, GitHub-এ দেবেন না, কিংবা কাউকে পাঠাবেন না।** Database-এর Row Level Security (RLS) নীতিই public key-সহ অননুমোদিত ব্যবহার সীমিত রাখে।

## ৫. সাইট Deploy ও Admin login

1. পরিবর্তিত ফাইলগুলো আপনার GitHub repository-তে commit/push করুন অথবা Netlify-তে নতুন deploy দিন।
2. Deploy শেষ হলে খুলুন: `https://YOUR-SITE-DOMAIN/admin/`
3. Supabase Auth-এ তৈরি করা Admin email ও password দিয়ে লগইন করুন।
4. Dashboard-এ **পেজ এডিটর**, **ভিডিও**, **যোগাযোগ ও লিংক**, **ডিজাইন**, **ভর্তির আবেদন**, **মিডিয়া লাইব্রেরি**, **ভার্সন ইতিহাস** ইত্যাদি ব্যবহার করুন।
5. পরিবর্তনের পর আগে **খসড়া সেভ**, তারপর লাইভ করতে **প্রকাশ করুন (Publish)** চাপুন।

## ৬. কীভাবে কাজ করবে

- Public website শুধু `published` content পড়বে।
- Admin-এর draft আলাদা থাকবে; Publish না করা পর্যন্ত লাইভ সাইট বদলাবে না।
- ফ্রি-ট্রায়াল ফর্ম WhatsApp-এ বার্তা তৈরি/খোলার পাশাপাশি Supabase-এ আবেদন সংরক্ষণের চেষ্টা করে।
- Admin panel-এ আবেদন দেখা, status বদলানো এবং CSV export করার সুবিধা আছে।
- ছবি `media` public bucket-এ রাখা হয়, যাতে ওয়েবসাইটে public image URL দিয়ে দেখা যায়; upload/list/delete কাজ Admin permission-এর অধীনে।

## ৭. নিরাপত্তা ও সমস্যা সমাধান

- `service_role`/secret key কখনো frontend-এ ব্যবহার করবেন না।
- Admin account-এ শক্তিশালী, অন্য কোথাও ব্যবহার না করা password ব্যবহার করুন।
- Admin login-এ “এই ইমেইলের অ্যাডমিন অনুমতি নেই” এলে Auth user email এবং `public.admins` টেবিলের email একই কি না দেখুন।
- “Invalid API key”/401 এলে `js/cms-config.js`-এর URL ও anon/publishable key যাচাই করুন।
- 403 এলে SQL Editor-এ schema/policies সফলভাবে তৈরি হয়েছে কি না এবং Auth user-কে `admins`-এ যোগ করা হয়েছে কি না যাচাই করুন।
- Website-এর আবেদন WhatsApp খুললেও Dashboard-এ না এলে Supabase connection, browser console এবং `applications` table-এর RLS policy পরীক্ষা করুন।

## বর্তমান ফাইলের অবস্থা

এই ZIP-এ Project URL আগে থেকেই দেওয়া আছে, কিন্তু `anonKey` ফাঁকা। তাই আপনার Supabase Dashboard থেকে সঠিক public key না বসানো পর্যন্ত CMS/Admin সংযোগ সম্পূর্ণ হবে না। Admin email-ও আপনার নিজের ইমেইল দিয়ে SQL-এ বসাতে হবে।
