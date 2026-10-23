-- Simulated OLD production data (for local migration tests only). Never run on the server.
BEGIN;
INSERT INTO organizations (id,name,slug,"updatedAt") VALUES ('org1','ستارگان پلاس','setareganplus',now());
INSERT INTO branches (id,"organizationId",name,slug,address,"bookletOpsKey","updatedAt") VALUES
 ('br-boys','org1','شعبه پسران قلم چی نسیم شهر','boys','نسیم‌شهر، بین کلانتری و بانک مسکن','BOYS',now()),
 ('br-girls','org1','شعبه دختران قلم چی نسیم شهر','girls','نسیم‌شهر، کوچه پاییزان','GIRLS',now()),
 ('br-elem','org1','دبستان','elem',NULL,'ELEMENTARY',now());
INSERT INTO media_assets (id,"organizationId","storageKey","originalName","mimeType","byteSize",checksum,"updatedAt") VALUES
 ('m1','org1','commerce/products/cover-a.jpg','a.jpg','image/jpeg',1,'x',now()),
 ('m2','org1','commerce/products/cover-b.jpg','b.jpg','image/jpeg',1,'x',now()),
 ('m3','org1','commerce/products/cover-c.jpg','c.jpg','image/jpeg',1,'x',now()),
 ('m4','org1','commerce/products/missing.jpg','d.jpg','image/jpeg',1,'x',now());
INSERT INTO book_titles (id,"organizationId",title,"updatedAt") VALUES
 ('t1','org1','جزوه ریاضی یازدهم',now()),('t2','org1','جزوه جامع علوم و فنون دوازدهم',now()),
 ('t3','org1','جزوه شیمی دهم',now()),('t4','org1','آزمایشی',now()),('t5','org1','جزوه عربی جامع',now());
INSERT INTO book_skus (id,"organizationId","titleId","internalCode",slug,"shortDescription",authors,subject,"gradeLabel","pageCount","printType","bindingType","formatSize","isVisible","isFeatured","sortOrder","primaryImageAssetId","trackInventory","stockQuantity","unlimitedStock","updatedAt","createdAt") VALUES
 ('s1','org1','t1','RIA11','riazi-11','جزوه کامل ریاضی پایه یازدهم با تست‌های طبقه‌بندی‌شده','مهندس رضا ابراهیمی','ریاضی','یازدهم',180,'BLACK_AND_WHITE','SPIRAL','A4',true,true,1,'m1',false,NULL,true,now(),now()-interval '90 days'),
 ('s2','org1','t2','OLOOM12','oloom-fonoon-12','خلاصه و تست جامع علوم و فنون','مسیح آراسته','علوم و فنون','دوازدهم',320,'COLOR','PERFECT','A4',true,false,2,'m2',true,4,false,now(),now()-interval '60 days'),
 ('s3','org1','t3','SHIMI10','shimi-10','','دکتر فراز ابراهیمی','شیمی','دهم',NULL,NULL,NULL,NULL,true,false,3,'m3',true,0,false,now(),now()-interval '3 days'),
 ('s4','org1','t4','TEST','test-item','','','',NULL,NULL,NULL,NULL,NULL,true,false,99,NULL,false,NULL,true,now(),now()),
 ('s5','org1','t5','ARABI','arabi-jame','عربی جامع کنکور','استاد حجت عمویی','عربی','دوازدهم',NULL,NULL,NULL,NULL,false,false,5,'m4',false,NULL,true,now(),now());
INSERT INTO book_sku_prices (id,"organizationId","skuId",kind,"amountRials","effectiveFrom","effectiveTo") VALUES
 ('p1','org1','s1','LIST',2000000,now()-interval '100 days',now()-interval '10 days'),
 ('p1b','org1','s1','LIST',2210000,now()-interval '10 days',NULL),
 ('p2','org1','s2','LIST',14130000,now()-interval '60 days',NULL),
 ('p2s','org1','s2','SALE',12500000,now()-interval '1 days',now()+interval '20 days'),
 ('p3','org1','s3','LIST',3500000,now()-interval '3 days',NULL),
 ('p4','org1','s4','LIST',100000,now(),NULL),
 ('p5','org1','s5','LIST',4000000,now(),NULL);
INSERT INTO commerce_notification_settings (id,"organizationId","adminNotificationSmsEnabled","adminSmsRecipients","updatedAt") VALUES
 ('ns1','org1',true,'[{"id":"a","mobile":"09120000001","enabled":true},{"id":"b","mobile":"09120000002","enabled":false}]',now());
INSERT INTO commerce_orders (id,"organizationId","pickupBranchId","orderNumber",status,"paymentStatus","opsStage","buyerName","buyerMobile","buyerNationalCode","parentName","studentGrade","studentMajor","bookletPaymentMethod","qrToken","shortCode","subtotalRials","grandTotalRials","specialNotes","notes","readyForPickupAt","deliveredAt","inProductionAt","pickupSignedBy","createdAt","updatedAt") VALUES
 ('o1','org1','br-boys','ORD-20261001-00001','PAID','PAID','PAID','علی رضایی','09121111111','0012345679',NULL,'GRADE_11','MATH','ONLINE','qrtok1aaaaaaaaaaaaaaaaaaa','AB12CD',2210000,2210000,'لطفاً صحافی محکم',NULL,NULL,NULL,NULL,NULL,'2026-10-01 08:00+00',now()),
 ('o2','org1','br-girls','ORD-20261005-00001','COMPLETED','PAID','DELIVERED_TO_STUDENT','زهرا محمدی','09122222222',NULL,'مریم','GRADE_12','EMPIRICAL','ONLINE','qrtok2bbbbbbbbbbbbbbbbbbb','ZX98QW',14130000,14130000,NULL,'تحویل به مادر','2026-10-06 10:00+00','2026-10-07 12:00+00','2026-10-05 12:00+00','مریم محمدی','2026-10-05 08:00+00',now()),
 ('o3','org1','br-boys','ORD-20261010-00001','AWAITING_PAYMENT','UNPAID','REGISTERED','حسین کریمی','09123333333',NULL,NULL,'GRADE_10',NULL,'ONLINE','qrtok3ccccccccccccccccccc','KK77LL',3500000,3500000,NULL,NULL,NULL,NULL,NULL,NULL,'2026-10-10 08:00+00',now()),
 ('o4','org1','br-elem','ORD-20261011-00001','FULFILLING','PAID','READY_FOR_PICKUP','نرگس احمدی','09124444444',NULL,NULL,'GRADE_12','HUMANITIES','CASH','qrtok4ddddddddddddddddddd','MN45OP',4000000,4000000,NULL,NULL,'2026-10-12 10:00+00',NULL,'2026-10-11 12:00+00',NULL,'2026-10-11 08:00+00',now()),
 ('o5','org1','br-girls','ORD-20261012-00001','PAID','PAID','IN_PRODUCTION','آزمایش','09125555555',NULL,NULL,NULL,NULL,'ONLINE','qrtok5eeeeeeeeeeeeeeeeeee','TT11TT',100000,100000,NULL,NULL,NULL,NULL,now(),NULL,'2026-10-12 08:00+00',now());
INSERT INTO commerce_order_items (id,"organizationId","orderId","bookSkuId","titleSnapshot","systemKindSnapshot","unitPriceRials",quantity,"totalRials","updatedAt") VALUES
 ('i1','org1','o1','s1','جزوه ریاضی یازدهم','PHYSICAL',2210000,1,2210000,now()),
 ('i2','org1','o2','s2','جزوه جامع علوم و فنون دوازدهم','PHYSICAL',14130000,1,14130000,now()),
 ('i3','org1','o3','s3','جزوه شیمی دهم','PHYSICAL',3500000,1,3500000,now()),
 ('i4','org1','o4','s5','جزوه عربی جامع','PHYSICAL',4000000,1,4000000,now()),
 ('i5','org1','o5','s4','آزمایشی','PHYSICAL',100000,1,100000,now());
INSERT INTO commerce_order_events (id,"organizationId","orderId","eventType",stage,title,note,"occurredAt") VALUES
 ('e1','org1','o1','STAGE_CHANGED','PAID','پرداخت موفق',NULL,'2026-10-01 08:05+00'),
 ('e2','org1','o2','STAGE_CHANGED','DELIVERED_TO_STUDENT','تحویل شد',NULL,'2026-10-07 12:00+00'),
 ('e3','org1','o2','NOTE_ADDED',NULL,'یادداشت','مادر دانش‌آموز تحویل گرفت','2026-10-07 12:01+00');
INSERT INTO payment_intents (id,"organizationId","payableType","payableId","idempotencyKey",status,provider,"amountRials","finalAmountRials","trackingCode","receiptNumber","paidAt","updatedAt","createdAt") VALUES
 ('pi1','org1','COMMERCE_ORDER','o1','k1','PAID','zibal',2210000,2210000,'111222333','REF-1','2026-10-01 08:05+00',now(),'2026-10-01 08:00+00'),
 ('pi2','org1','COMMERCE_ORDER','o2','k2','PAID','zibal',14130000,14130000,'444555666','REF-2','2026-10-05 08:05+00',now(),'2026-10-05 08:00+00'),
 ('pi3','org1','COMMERCE_ORDER','o3','k3','FAILED','zibal',3500000,3500000,NULL,NULL,NULL,now(),'2026-10-10 08:00+00'),
 ('pi9','org1','REGISTRATION','reg1','k9','PAID','zibal',5000000,5000000,'999','R9',now(),now(),now());
INSERT INTO payment_sessions (id,"organizationId","paymentIntentId",provider,"providerSessionId",status,"callbackToken","completedAt","updatedAt","createdAt") VALUES
 ('ps1','org1','pi1','zibal','111222333','PAID','cb1',now(),now(),'2026-10-01 08:00+00'),
 ('ps2','org1','pi2','zibal','444555666','PAID','cb2',now(),now(),'2026-10-05 08:00+00'),
 ('ps3','org1','pi3','zibal','777888999','FAILED','cb3',NULL,now(),'2026-10-10 08:00+00');
COMMIT;
