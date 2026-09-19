-- Adds only independent SEO data for the reviewed public pages.
-- Existing SEO rows are preserved. Cover ownership and publication state are checked in SQL.
WITH planned(entity_type,entity_id,title,description,og_asset_id,source_collection_id) AS (VALUES
('homepage','homepage','UTOA Photography｜旅行、街拍與航海攝影','UTOA 的攝影作品集，收錄東京與近郊的櫻花街景、北海道的湖泊與北方海岸，以及御風輪往返港灣的航海紀錄。依年份與旅程瀏覽，從城市日常、沿途風景到海上天光，看見鏡頭留下的片刻。','r2-1762757616433-nyg4bv','05d5379a-245d-440e-bd82-ae23bbd2abef'),
('location','9255191b-6874-4950-8931-41b5f54d8ce4','東京與近郊攝影｜櫻花街景、鐵道與海岸 — UTOA Photography','2026 年東京與近郊的旅行攝影：上野、新宿御苑與隅田公園的櫻花，銀座街景、東京車站夜色，以及江之島海岸與鎌倉江之電。循著十組作品，觀看城市、花木與海面的不同光線。','r2-cli-994759f5bebeb43e','79f4dfa5-5e35-44e7-99f2-5c29d2fbca60'),
('location','80ec3a48-f0eb-4ed7-8a7c-5740fd328028','北海道旅行攝影｜湖泊、田野與北方海岸 — UTOA Photography','2025 年北海道旅行的影像紀錄，從帶廣、釧路走向網走與稚內，再看美瑛田野、札幌街景、洞爺湖煙火與支笏湖水色。十組作品收錄沿途小站、港口、湖畔與餐桌上的片刻。','r2-1765203116392-z6jk3e','94252b19-fdba-4fa7-b4e3-2fedb995c666'),
('location','84d27b43-022f-431f-a2c0-b3d1593de30c','御風輪航海攝影｜高雄港、東京灣與海上日常 — UTOA Photography','2025 年御風輪旅程的攝影紀錄，收錄高雄港與東京灣的拖船、領港作業、船橋與舷窗風景，以及海上日出夕陽。也從船上走進東京街頭，以八組作品留下航行與岸上散步的片刻。','r2-1762753442899-akcie1','23de6e8c-e479-45ff-be5b-25a3b661829d'),
('collection','25a34e06-28f7-43fd-9ff7-911e23eadad9','江之島攝影｜參道、海岸與遠山 — UTOA Photography','沿江之島的參道與石階走向海邊，記錄鳥居、商店街、春日花木與岩岸風景。從街巷中的行人，到海面彼端的山影，收錄這趟旅程裡安靜與熱鬧交錯的片刻。','r2-cli-2eec87d34deb558e','25a34e06-28f7-43fd-9ff7-911e23eadad9'),
('collection','9e2faa2d-30cc-4a25-8a81-e5069f366c7e','銀座、日本橋街拍｜櫻花街道與城市光影 — UTOA Photography','銀座與日本橋的街頭攝影，從白天的車流、辦公大樓與櫻花樹影，走到入夜後的招牌燈光。以街道縱深、建築立面和行人的尺度，記錄東京春日的城市風景。','r2-cli-5365bb3881915f41','9e2faa2d-30cc-4a25-8a81-e5069f366c7e'),
('collection','8bc5dfb7-e69a-4cfb-b050-4a4bf502fbcd','鎌倉鐵道攝影｜江之電、平交道與湘南海岸 — UTOA Photography','綠色江之電沿著海岸駛過，平交道、架空電線與浪花交織成鎌倉的日常。這組作品收錄鎌倉高校前站、沿海鐵道、海邊公路，以及傍晚車站與商店的光景。','r2-cli-f75c614f2d333453','8bc5dfb7-e69a-4cfb-b050-4a4bf502fbcd'),
('collection','37bbc196-d38a-49b0-bb83-3a314dc42183','澀谷、六本木攝影｜路口人潮與東京天際線 — UTOA Photography','從高處俯看澀谷路口的人潮與車流，再沿街道望向東京鐵塔。作品收錄六本木周邊的都市風景、麻布台之丘與高樓立面，觀察東京街區由近到遠的空間層次。','r2-cli-99953485da529127','37bbc196-d38a-49b0-bb83-3a314dc42183'),
('collection','e3d70e8c-11e0-4c05-b8e3-90d837bbef20','新宿御苑攝影｜櫻花、草地與池畔春景 — UTOA Photography','新宿御苑的春日白天，櫻花枝頭映著藍天，遊人在草地上休息，池水倒映樹木與新綠。從花朵近景到開闊庭園，記錄東京市中心一段放慢腳步的時光。','r2-cli-076f1eb42a8b3cab','e3d70e8c-11e0-4c05-b8e3-90d837bbef20'),
('collection','42506378-3e30-4a15-90c5-3003565a3a94','隅田公園攝影｜櫻花、人力車與晴空塔 — UTOA Photography','櫻花沿著隅田公園步道伸展，人力車與行人穿梭其間，晴空塔從花枝後方露出。這組春日作品以街頭片刻與樹影構圖，記錄淺草一帶的賞花風景。','r2-cli-9368e42bd167dd4b','42506378-3e30-4a15-90c5-3003565a3a94'),
('collection','79f4dfa5-5e35-44e7-99f2-5c29d2fbca60','東京車站與皇居攝影｜紅磚夜景、櫻花與小舟 — UTOA Photography','夜色中的東京車站亮起暖光，皇居周邊的護城河則映著櫻花與划船人影。收錄紅磚站舍、丸之內高樓，以及白天與點燈後的水岸花景，對照東京兩種不同的光線。','r2-cli-994759f5bebeb43e','79f4dfa5-5e35-44e7-99f2-5c29d2fbca60'),
('collection','803817e6-73e3-4f8f-a151-2b245789c985','上野春日攝影｜櫻花、電車與商店街 — UTOA Photography','上野的春天，櫻花與賞花人群之外，也有高架電車、街頭招牌和忙碌的路口。從公園花枝、上野站到商店街與餐館窗口，以照片留下東京街區的生活片段。','r2-cli-ead18c4190a7dcad','803817e6-73e3-4f8f-a151-2b245789c985'),
('collection','0d6bb1ae-d3d5-402a-ae67-b026d566cc44','魚波夜景攝影｜東京街角的招牌與燈光 — UTOA Photography','以三個街頭視角記錄入夜後的魚波店面。暖色燈籠、發亮的招牌與藍色霓虹疊在狹窄建築上，映出東京街角的小店外觀、道路與行人剪影。','r2-cli-ad29cd379e13b455','0d6bb1ae-d3d5-402a-ae67-b026d566cc44'),
('collection','13f9e946-46e7-4752-985f-57f2d7955c41','代代木鐵道街拍｜平交道、列車與城市街景 — UTOA Photography','在代代木的街道旁觀看列車駛過平交道，記錄號誌、架空電線、行人與高樓的交錯。作品也收錄綠樹街景及代代木站外觀，呈現晴日裡的東京通勤風景。','r2-cli-152904b9cea463da','13f9e946-46e7-4752-985f-57f2d7955c41'),
('collection','9747d21d-0cb7-4d20-83c5-20407476e4d1','網走與層雲峽攝影｜湖畔、鐵道與瀑布 — UTOA Photography','北海道旅途中，從網走湖與監獄博物館的木造長廊，走到小車站、濕地與層雲峽瀑布。作品也留下知床五湖一帶的綠意與鹿的身影，記錄陰天之下的道東風景。','r2-1765173965112-q2f1dc','9747d21d-0cb7-4d20-83c5-20407476e4d1'),
('collection','b70851c0-0059-4397-ac3c-6f601ab54d65','北海道美食攝影｜烤魚、串燒與餐桌片刻 — UTOA Photography','北海道旅程裡的餐桌紀錄：炸物、串燒、烤魚與魷魚，還有生魚片拼盤和舉杯相聚的片刻。以近距離畫面留下食物的色澤、烤物紋理與木桌上的暖光。','r2-1765211791257-p6kkl3','b70851c0-0059-4397-ac3c-6f601ab54d65'),
('collection','94252b19-fdba-4fa7-b4e3-2fedb995c666','旭川、美瑛與富良野攝影｜田野、樹木與長路 — UTOA Photography','從旭川的橋梁到美瑛、富良野一帶的田野，記錄起伏丘陵上的樹、車站、摩天輪與延伸向遠方的公路。低雲、草地和沿途建築，構成北海道旅程中的開闊風景。','r2-1765203116392-z6jk3e','94252b19-fdba-4fa7-b4e3-2fedb995c666'),
('collection','9ac4a9c3-85fb-469d-a9ba-74a0fe580087','釧路與厚岸攝影｜濕原車站、湖畔與漁港 — UTOA Photography','釧路一帶的旅途影像，收錄濕原展望、林間小站、塘路湖船隻，以及漁港裡的作業船。沿途也記錄厚岸大橋與水面上的神社，呈現北海道東部安靜的水岸風景。','r2-1765172574011-kklq5c','9ac4a9c3-85fb-469d-a9ba-74a0fe580087'),
('collection','a54b3028-d4e8-4bdb-a98b-f69a0d24deea','屈斜路湖與道東攝影｜湖景、硫黃山與瀑布 — UTOA Photography','低雲籠罩屈斜路湖，湖畔停著天鵝船，硫黃山的蒸氣沿山坡升起。這組道東旅行影像也收錄霧中的摩周湖到訪紀錄、櫻花瀑布躍魚，以及筆直延伸的公路。','r2-1765172995326-c1pogu','a54b3028-d4e8-4bdb-a98b-f69a0d24deea'),
('collection','d43d3bcd-9f78-48a4-9071-66e753070f60','支笏湖攝影｜湖畔山色、山線鐵橋與碧水 — UTOA Photography','雲霧停在支笏湖對岸的山間，岸邊大樹、紅色山線鐵橋與清澈水色相互映照。作品沿湖畔步道記錄神社、舊鐵道展示與水岸細節，留下北海道湖畔的光景。','r2-1765209738344-bn8o2o','d43d3bcd-9f78-48a4-9071-66e753070f60'),
('collection','3288a2aa-0446-4b48-bfe4-7f070e06833f','洞爺湖攝影｜湖上煙火、山影與湖畔風景 — UTOA Photography','白天的洞爺湖有山影、天鵝船與湖畔雕塑，入夜後煙火在水面上展開。這組旅行照片也收錄霧中的遊船與昭和新山熊牧場，記錄湖區從安靜到熱鬧的不同片刻。','r2-1765208889307-l6niwx','3288a2aa-0446-4b48-bfe4-7f070e06833f'),
('collection','efb4a580-c020-42f5-bd58-034450ce20c6','帶廣與十勝攝影｜花園、溪谷與街頭夜色 — UTOA Photography','十勝之丘公園的花朵與花時計、溪谷裡的水流、霧中的橋梁，連到帶廣街頭的夜間燈光。以沿途風景和店面細節，記錄北海道旅程裡從白天到入夜的光線變化。','r2-1765172225911-df7ru6','efb4a580-c020-42f5-bd58-034450ce20c6'),
('collection','98905654-7328-41c3-99c0-123cf80279a1','札幌攝影｜北海道神宮、城市遠景與建築線條 — UTOA Photography','從北海道神宮的屋簷與林間光線，到紅磚廳舍、札幌車站與藻岩山眺望的城市。作品也收錄莫埃來沼公園的玻璃建築與幾何細節，觀察札幌自然與建築並存的風景。','r2-1765206505863-2cypw7','98905654-7328-41c3-99c0-123cf80279a1'),
('collection','7971193c-02a7-4e0b-9f2e-5776438c9480','稚內與道北攝影｜宗谷岬、草原與北方海岸 — UTOA Photography','沿著道北的長路走向稚內，記錄草原、風車、鹿與漁港。從宗谷岬的紀念碑和燈塔，到北防波堤穹頂、車站及遠方的利尻島，收錄北海道北端的海岸與日常。','r2-1765174585049-iq3j8c','7971193c-02a7-4e0b-9f2e-5776438c9480'),
('collection','27ee8e31-e9f7-41d3-b208-15317394f053','高雄港出航攝影｜御風輪、拖船與港灣風景 — UTOA Photography','從御風輪的船身、桅杆與船橋望向高雄港，記錄拖船迴轉、甲板作業和港邊建築。隨著船首朝向海面，舷窗裡的藍色海景與飛鳥，也成為這段航程的開場。','r2-1761392605690-mua13n','27ee8e31-e9f7-41d3-b208-15317394f053'),
('collection','23de6e8c-e479-45ff-be5b-25a3b661829d','御風輪航行日攝影｜船橋、舷窗與海上日常 — UTOA Photography','海面從舷窗外延伸到遠方，船橋裡的雷達、電子海圖、航海日誌與磁羅經，記錄航行中的日常。從船邊浪花到夜間船首的光束，以近景與遠景觀看御風輪上的一天。','r2-1762753442899-akcie1','23de6e8c-e479-45ff-be5b-25a3b661829d'),
('collection','05d5379a-245d-440e-bd82-ae23bbd2abef','海上日出與夕陽攝影｜御風輪航程中的天光 — UTOA Photography','從舷窗與船首看見海上的日出、夕陽和雲隙光，橙金色逐漸轉為粉紫與深藍。作品收錄海平線、月色與遠處風機的剪影，記錄御風輪航程中不斷變化的天空。','r2-1762757616433-nyg4bv','05d5379a-245d-440e-bd82-ae23bbd2abef'),
('collection','f4624ec4-8557-4ad3-8da4-2d8516f93c6b','東京灣航海攝影｜領港作業與跨海橋梁 — UTOA Photography','從御風輪上記錄東京灣的領港艇、船橋作業與港區風景。鏡頭沿著航標、跨海橋梁和浮塢移動，也捕捉從船舶上方掠過的飛機，呈現船上視角的東京灣。','r2-1763279299762-6qtq0l','f4624ec4-8557-4ad3-8da4-2d8516f93c6b'),
('collection','aa950e45-6744-49e6-ab55-369387a0b1a4','東京灣船舶攝影｜拖船、領港艇與海上地標 — UTOA Photography','船側的領港艇、劃出白色尾流的拖船，以及薄霧中的商船與跨海橋梁，構成東京灣另一段航行紀錄。作品也收錄船上旗幟、船橋人物與海底隧道通風塔的遠景。','r2-1763280086535-3pr7u3','aa950e45-6744-49e6-ab55-369387a0b1a4'),
('collection','518729e7-4b2a-455c-a685-80c784b0d9cf','高雄港船舶攝影｜領港小艇與港都天際線 — UTOA Photography','由御風輪望向高雄港，領港小艇靠近船側，商船與港都建築在陰天下交錯。這組作品收錄澎湖輪、船橋作業、浮塢、碼頭與船上餐廳，留下另一段港口紀錄。','r2-1763288843267-qluih3','518729e7-4b2a-455c-a685-80c784b0d9cf'),
('collection','1e3e15b8-04de-440a-ac69-f5d18052c186','東京街頭攝影｜淺草寺、聖橋與神田明神 — UTOA Photography','從淺草寺的雷門與商店街出發，走過晴空塔、聖橋旁的河道與鐵路，再到神田明神與不忍池。這組御風輪旅程中的東京岸上照片，記錄寺社、交通與街頭生活。','r2-1763357109025-3u4shs','1e3e15b8-04de-440a-ac69-f5d18052c186'),
('collection','58e2ee24-8a84-4da1-bf7c-badd2ddfa8cc','東京鐵塔攝影｜紅白鋼構、樹影與城市街景 — UTOA Photography','從樹梢、街角與階梯間仰望東京鐵塔，紅白鋼構在藍天與逆光中展現不同線條。作品也收錄從塔上向下俯看的結構與地面，透過遠近視角觀看這座東京地標。','r2-1763358114657-ih9j6f','58e2ee24-8a84-4da1-bf7c-badd2ddfa8cc')
)
INSERT INTO seo_metadata (id,entity_type,entity_id,title,description,og_asset_id,updated_at)
SELECT 'seo-content-20260919-' || p.entity_type || '-' || p.entity_id,
 p.entity_type,p.entity_id,p.title,p.description,p.og_asset_id,strftime('%Y-%m-%dT%H:%M:%fZ','now')
FROM planned p
JOIN collection_assets ca ON ca.collection_id=p.source_collection_id AND ca.asset_id=p.og_asset_id
JOIN collections c ON c.id=ca.collection_id
JOIN years y ON y.id=c.year_id
WHERE c.status='published' AND y.status='published'
 AND ((p.entity_type='homepage' AND p.entity_id='homepage')
   OR (p.entity_type='location' AND p.entity_id=c.location_id)
   OR (p.entity_type='collection' AND p.entity_id=c.id))
ON CONFLICT(entity_type,entity_id) DO NOTHING;

INSERT INTO audit_logs (id,actor,actor_type,entity_type,entity_id,action,timestamp,meta)
SELECT id,'seo-content-2026-09-19','system','seo_metadata',entity_type || '/' || entity_id,'create',updated_at,
 json_object('source','User-requested full-site SEO after image inspection','batch_sha256','0f5632ee81dcf41de1d33e1174f4e00b3ec9a2768c337699d27b7e8530248ce3',
  'title',title,'description',description,'og_asset_id',og_asset_id)
FROM seo_metadata WHERE id IN (
'seo-content-20260919-homepage-homepage',
'seo-content-20260919-location-9255191b-6874-4950-8931-41b5f54d8ce4',
'seo-content-20260919-location-80ec3a48-f0eb-4ed7-8a7c-5740fd328028',
'seo-content-20260919-location-84d27b43-022f-431f-a2c0-b3d1593de30c',
'seo-content-20260919-collection-25a34e06-28f7-43fd-9ff7-911e23eadad9',
'seo-content-20260919-collection-9e2faa2d-30cc-4a25-8a81-e5069f366c7e',
'seo-content-20260919-collection-8bc5dfb7-e69a-4cfb-b050-4a4bf502fbcd',
'seo-content-20260919-collection-37bbc196-d38a-49b0-bb83-3a314dc42183',
'seo-content-20260919-collection-e3d70e8c-11e0-4c05-b8e3-90d837bbef20',
'seo-content-20260919-collection-42506378-3e30-4a15-90c5-3003565a3a94',
'seo-content-20260919-collection-79f4dfa5-5e35-44e7-99f2-5c29d2fbca60',
'seo-content-20260919-collection-803817e6-73e3-4f8f-a151-2b245789c985',
'seo-content-20260919-collection-0d6bb1ae-d3d5-402a-ae67-b026d566cc44',
'seo-content-20260919-collection-13f9e946-46e7-4752-985f-57f2d7955c41',
'seo-content-20260919-collection-9747d21d-0cb7-4d20-83c5-20407476e4d1',
'seo-content-20260919-collection-b70851c0-0059-4397-ac3c-6f601ab54d65',
'seo-content-20260919-collection-94252b19-fdba-4fa7-b4e3-2fedb995c666',
'seo-content-20260919-collection-9ac4a9c3-85fb-469d-a9ba-74a0fe580087',
'seo-content-20260919-collection-a54b3028-d4e8-4bdb-a98b-f69a0d24deea',
'seo-content-20260919-collection-d43d3bcd-9f78-48a4-9071-66e753070f60',
'seo-content-20260919-collection-3288a2aa-0446-4b48-bfe4-7f070e06833f',
'seo-content-20260919-collection-efb4a580-c020-42f5-bd58-034450ce20c6',
'seo-content-20260919-collection-98905654-7328-41c3-99c0-123cf80279a1',
'seo-content-20260919-collection-7971193c-02a7-4e0b-9f2e-5776438c9480',
'seo-content-20260919-collection-27ee8e31-e9f7-41d3-b208-15317394f053',
'seo-content-20260919-collection-23de6e8c-e479-45ff-be5b-25a3b661829d',
'seo-content-20260919-collection-05d5379a-245d-440e-bd82-ae23bbd2abef',
'seo-content-20260919-collection-f4624ec4-8557-4ad3-8da4-2d8516f93c6b',
'seo-content-20260919-collection-aa950e45-6744-49e6-ab55-369387a0b1a4',
'seo-content-20260919-collection-518729e7-4b2a-455c-a685-80c784b0d9cf',
'seo-content-20260919-collection-1e3e15b8-04de-440a-ac69-f5d18052c186',
'seo-content-20260919-collection-58e2ee24-8a84-4da1-bf7c-badd2ddfa8cc'
)
ON CONFLICT(id) DO NOTHING;
