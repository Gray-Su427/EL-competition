-- OCR 识别结果
CREATE TABLE IF NOT EXISTS ocr_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT,
    text TEXT,
    confidence REAL,
    bbox TEXT
);

INSERT INTO ocr_results (filename, text, confidence, bbox) VALUES ('QQ图片20260607183310.jpeg', '面食/煎炸饼类', 0.9227, '[[661.0, 95.0], [1387.0, 98.0], [1387.0, 172.0], [661.0, 169.0]]');
INSERT INTO ocr_results (filename, text, confidence, bbox) VALUES ('QQ图片20260607183310.jpeg', '白馒头', 0.9928, '[[452.0, 213.0], [565.0, 213.0], [565.0, 251.0], [452.0, 251.0]]');
INSERT INTO ocr_results (filename, text, confidence, bbox) VALUES ('QQ图片20260607183310.jpeg', '0.2元', 0.9977, '[[683.0, 217.0], [791.0, 217.0], [791.0, 256.0], [683.0, 256.0]]');
INSERT INTO ocr_results (filename, text, confidence, bbox) VALUES ('QQ图片20260607183310.jpeg', '豆沙包', 0.9976, '[[864.0, 216.0], [973.0, 216.0], [973.0, 254.0], [864.0, 254.0]]');
INSERT INTO ocr_results (filename, text, confidence, bbox) VALUES ('QQ图片20260607183310.jpeg', '1.5', 0.9988, '[[1089.0, 222.0], [1149.0, 222.0], [1149.0, 252.0], [1089.0, 252.0]]');
INSERT INTO ocr_results (filename, text, confidence, bbox) VALUES ('QQ图片20260607183310.jpeg', '元元元元元元', 0.9988, '[[1142.0, 215.0], [1193.0, 213.0], [1204.0, 444.0], [1153.0, 446.0]]');
INSERT INTO ocr_results (filename, text, confidence, bbox) VALUES ('QQ图片20260607183310.jpeg', '甜酥饼', 0.9999, '[[1260.0, 216.0], [1368.0, 216.0], [1368.0, 254.0], [1260.0, 254.0]]');
INSERT INTO ocr_results (filename, text, confidence, bbox) VALUES ('QQ图片20260607183310.jpeg', '白米粥', 0.9986, '[[1782.0, 220.0], [1884.0, 220.0], [1884.0, 258.0], [1782.0, 258.0]]');
INSERT INTO ocr_results (filename, text, confidence, bbox) VALUES ('QQ图片20260607183310.jpeg', '荞麦馒头', 0.9844, '[[450.0, 249.0], [601.0, 252.0], [600.0, 290.0], [449.0, 287.0]]');
INSERT INTO ocr_results (filename, text, confidence, bbox) VALUES ('QQ图片20260607183310.jpeg', '0.5元', 0.9982, '[[682.0, 252.0], [792.0, 252.0], [792.0, 295.0], [682.0, 295.0]]');
INSERT INTO ocr_results (filename, text, confidence, bbox) VALUES ('QQ图片20260607183310.jpeg', '韭菜鸡蛋盒', 0.9925, '[[866.0, 255.0], [1042.0, 255.0], [1042.0, 289.0], [866.0, 289.0]]');
INSERT INTO ocr_results (filename, text, confidence, bbox) VALUES ('QQ图片20260607183310.jpeg', '1.5', 0.9984, '[[1089.0, 253.0], [1151.0, 253.0], [1151.0, 291.0], [1089.0, 291.0]]');
INSERT INTO ocr_results (filename, text, confidence, bbox) VALUES ('QQ图片20260607183310.jpeg', '咸烧饼', 0.9966, '[[1263.0, 253.0], [1371.0, 253.0], [1371.0, 291.0], [1263.0, 291.0]]');
INSERT INTO ocr_results (filename, text, confidence, bbox) VALUES ('QQ图片20260607183310.jpeg', '黑米馒头', 0.9970, '[[449.0, 290.0], [600.0, 290.0], [600.0, 327.0], [449.0, 327.0]]');
INSERT INTO ocr_results (filename, text, confidence, bbox) VALUES ('QQ图片20260607183310.jpeg', '雪菜饼', 0.9980, '[[865.0, 291.0], [975.0, 291.0], [975.0, 329.0], [865.0, 329.0]]');
INSERT INTO ocr_results (filename, text, confidence, bbox) VALUES ('QQ图片20260607183310.jpeg', '1.5', 0.9982, '[[1089.0, 291.0], [1152.0, 291.0], [1152.0, 328.0], [1089.0, 328.0]]');
INSERT INTO ocr_results (filename, text, confidence, bbox) VALUES ('QQ图片20260607183310.jpeg', '油炸盒子', 0.9971, '[[1265.0, 291.0], [1406.0, 289.0], [1406.0, 325.0], [1265.0, 328.0]]');
INSERT INTO ocr_results (filename, text, confidence, bbox) VALUES ('QQ图片20260607183310.jpeg', '绿豆粥', 0.9999, '[[1786.0, 282.0], [1891.0, 282.0], [1891.0, 320.0], [1786.0, 320.0]]');
INSERT INTO ocr_results (filename, text, confidence, bbox) VALUES ('QQ图片20260607183310.jpeg', '0.5元', 0.9977, '[[684.0, 293.0], [765.0, 293.0], [765.0, 325.0], [684.0, 325.0]]');
INSERT INTO ocr_results (filename, text, confidence, bbox) VALUES ('QQ图片20260607183310.jpeg', '元', 0.9994, '[[750.0, 292.0], [787.0, 292.0], [787.0, 327.0], [750.0, 327.0]]');
INSERT INTO ocr_results (filename, text, confidence, bbox) VALUES ('QQ图片20260607183310.jpeg', '花卷', 0.9991, '[[448.0, 327.0], [525.0, 327.0], [525.0, 363.0], [448.0, 363.0]]');
INSERT INTO ocr_results (filename, text, confidence, bbox) VALUES ('QQ图片20260607183310.jpeg', '0.6', 0.9973, '[[684.0, 331.0], [757.0, 331.0], [757.0, 362.0], [684.0, 362.0]]');
INSERT INTO ocr_results (filename, text, confidence, bbox) VALUES ('QQ图片20260607183310.jpeg', '元', 0.9961, '[[754.0, 325.0], [787.0, 325.0], [787.0, 367.0], [754.0, 367.0]]');
INSERT INTO ocr_results (filename, text, confidence, bbox) VALUES ('QQ图片20260607183310.jpeg', '豆腐饼', 0.9995, '[[865.0, 328.0], [976.0, 328.0], [976.0, 365.0], [865.0, 365.0]]');
INSERT INTO ocr_results (filename, text, confidence, bbox) VALUES ('QQ图片20260607183310.jpeg', '1.5', 0.9986, '[[1089.0, 325.0], [1154.0, 325.0], [1154.0, 365.0], [1089.0, 365.0]]');
INSERT INTO ocr_results (filename, text, confidence, bbox) VALUES ('QQ图片20260607183310.jpeg', '肉松饼', 0.9989, '[[1265.0, 326.0], [1374.0, 323.0], [1375.0, 361.0], [1266.0, 364.0]]');
INSERT INTO ocr_results (filename, text, confidence, bbox) VALUES ('QQ图片20260607183310.jpeg', '红豆粥', 0.9993, '[[1793.0, 343.0], [1898.0, 343.0], [1898.0, 381.0], [1793.0, 381.0]]');
INSERT INTO ocr_results (filename, text, confidence, bbox) VALUES ('QQ图片20260607183310.jpeg', '红糖馒头', 0.9980, '[[444.0, 363.0], [598.0, 365.0], [598.0, 403.0], [444.0, 401.0]]');
INSERT INTO ocr_results (filename, text, confidence, bbox) VALUES ('QQ图片20260607183310.jpeg', '2元', 0.6286, '[[753.0, 354.0], [788.0, 354.0], [788.0, 407.0], [753.0, 407.0]]');
INSERT INTO ocr_results (filename, text, confidence, bbox) VALUES ('QQ图片20260607183310.jpeg', '0.8', 0.9973, '[[683.0, 367.0], [756.0, 367.0], [756.0, 399.0], [683.0, 399.0]]');
INSERT INTO ocr_results (filename, text, confidence, bbox) VALUES ('QQ图片20260607183310.jpeg', '春卷', 0.9985, '[[865.0, 363.0], [941.0, 363.0], [941.0, 403.0], [865.0, 403.0]]');
INSERT INTO ocr_results (filename, text, confidence, bbox) VALUES ('QQ图片20260607183310.jpeg', '1.5', 0.9980, '[[1091.0, 364.0], [1154.0, 364.0], [1154.0, 401.0], [1091.0, 401.0]]');
INSERT INTO ocr_results (filename, text, confidence, bbox) VALUES ('QQ图片20260607183310.jpeg', '豆角饼', 0.9991, '[[1267.0, 362.0], [1377.0, 362.0], [1377.0, 400.0], [1267.0, 400.0]]');
INSERT INTO ocr_results (filename, text, confidence, bbox) VALUES ('QQ图片20260607183310.jpeg', '2.5', 0.9970, '[[1489.0, 361.0], [1562.0, 361.0], [1562.0, 398.0], [1489.0, 398.0]]');
INSERT INTO ocr_results (filename, text, confidence, bbox) VALUES ('QQ图片20260607183310.jpeg', '元', 0.9991, '[[1556.0, 365.0], [1589.0, 365.0], [1589.0, 397.0], [1556.0, 397.0]]');
INSERT INTO ocr_results (filename, text, confidence, bbox) VALUES ('QQ图片20260607183310.jpeg', '包菜包', 0.9983, '[[446.0, 402.0], [560.0, 402.0], [560.0, 440.0], [446.0, 440.0]]');
INSERT INTO ocr_results (filename, text, confidence, bbox) VALUES ('QQ图片20260607183310.jpeg', '元', 0.9542, '[[753.0, 395.0], [788.0, 395.0], [788.0, 443.0], [753.0, 443.0]]');
INSERT INTO ocr_results (filename, text, confidence, bbox) VALUES ('QQ图片20260607183310.jpeg', '0.5', 0.9977, '[[683.0, 405.0], [757.0, 405.0], [757.0, 438.0], [683.0, 438.0]]');
INSERT INTO ocr_results (filename, text, confidence, bbox) VALUES ('QQ图片20260607183310.jpeg', '豆沙饼', 0.9985, '[[866.0, 402.0], [978.0, 402.0], [978.0, 440.0], [866.0, 440.0]]');
INSERT INTO ocr_results (filename, text, confidence, bbox) VALUES ('QQ图片20260607183310.jpeg', '1.5', 0.9975, '[[1092.0, 404.0], [1153.0, 402.0], [1154.0, 435.0], [1093.0, 438.0]]');
INSERT INTO ocr_results (filename, text, confidence, bbox) VALUES ('QQ图片20260607183310.jpeg', '蛋挞', 0.9984, '[[1268.0, 400.0], [1343.0, 400.0], [1343.0, 437.0], [1268.0, 437.0]]');
INSERT INTO ocr_results (filename, text, confidence, bbox) VALUES ('QQ图片20260607183310.jpeg', '2.5元', 0.9977, '[[1490.0, 397.0], [1595.0, 397.0], [1595.0, 436.0], [1490.0, 436.0]]');
INSERT INTO ocr_results (filename, text, confidence, bbox) VALUES ('QQ图片20260607183310.jpeg', '小米粥', 0.9992, '[[1802.0, 408.0], [1905.0, 408.0], [1905.0, 447.0], [1802.0, 447.0]]');
INSERT INTO ocr_results (filename, text, confidence, bbox) VALUES ('QQ图片20260607183310.jpeg', '2元', 0.6102, '[[754.0, 430.0], [788.0, 430.0], [788.0, 482.0], [754.0, 482.0]]');
INSERT INTO ocr_results (filename, text, confidence, bbox) VALUES ('QQ图片20260607183310.jpeg', '元', 0.9967, '[[1158.0, 423.0], [1196.0, 423.0], [1196.0, 480.0], [1158.0, 480.0]]');
INSERT INTO ocr_results (filename, text, confidence, bbox) VALUES ('QQ图片20260607183310.jpeg', '萝卜粉丝包', 0.9918, '[[444.0, 442.0], [633.0, 442.0], [633.0, 478.0], [444.0, 478.0]]');
INSERT INTO ocr_results (filename, text, confidence, bbox) VALUES ('QQ图片20260607183310.jpeg', '萝卜饼', 0.9857, '[[866.0, 440.0], [978.0, 440.0], [978.0, 477.0], [866.0, 477.0]]');
INSERT INTO ocr_results (filename, text, confidence, bbox) VALUES ('QQ图片20260607183310.jpeg', '1.5', 0.9978, '[[1094.0, 441.0], [1155.0, 441.0], [1155.0, 474.0], [1094.0, 474.0]]');
INSERT INTO ocr_results (filename, text, confidence, bbox) VALUES ('QQ图片20260607183310.jpeg', '鸡蛋饼', 0.9998, '[[1269.0, 438.0], [1378.0, 438.0], [1378.0, 472.0], [1269.0, 472.0]]');
INSERT INTO ocr_results (filename, text, confidence, bbox) VALUES ('QQ图片20260607183310.jpeg', '3元', 0.9215, '[[1493.0, 434.0], [1565.0, 434.0], [1565.0, 474.0], [1493.0, 474.0]]');
INSERT INTO ocr_results (filename, text, confidence, bbox) VALUES ('QQ图片20260607183310.jpeg', '1.2', 0.9980, '[[683.0, 444.0], [747.0, 444.0], [747.0, 476.0], [683.0, 476.0]]');
INSERT INTO ocr_results (filename, text, confidence, bbox) VALUES ('QQ图片20260607183310.jpeg', '元', 0.7710, '[[752.0, 468.0], [788.0, 468.0], [788.0, 516.0], [752.0, 516.0]]');
INSERT INTO ocr_results (filename, text, confidence, bbox) VALUES ('QQ图片20260607183310.jpeg', '1.5元', 0.9976, '[[1091.0, 472.0], [1198.0, 469.0], [1199.0, 512.0], [1092.0, 514.0]]');
INSERT INTO ocr_results (filename, text, confidence, bbox) VALUES ('QQ图片20260607183310.jpeg', '香酥饼', 0.9996, '[[1272.0, 474.0], [1382.0, 471.0], [1383.0, 510.0], [1273.0, 512.0]]');
INSERT INTO ocr_results (filename, text, confidence, bbox) VALUES ('QQ图片20260607183310.jpeg', '3元', 0.9982, '[[1493.0, 468.0], [1569.0, 468.0], [1569.0, 513.0], [1493.0, 513.0]]');
INSERT INTO ocr_results (filename, text, confidence, bbox) VALUES ('QQ图片20260607183310.jpeg', '雪菜肉沫包', 0.9936, '[[444.0, 482.0], [633.0, 479.0], [633.0, 516.0], [444.0, 518.0]]');
INSERT INTO ocr_results (filename, text, confidence, bbox) VALUES ('QQ图片20260607183310.jpeg', '1.2元', 0.9408, '[[682.0, 480.0], [762.0, 480.0], [762.0, 515.0], [682.0, 515.0]]');
INSERT INTO ocr_results (filename, text, confidence, bbox) VALUES ('QQ图片20260607183310.jpeg', '麻团', 0.9998, '[[866.0, 479.0], [941.0, 479.0], [941.0, 516.0], [866.0, 516.0]]');
INSERT INTO ocr_results (filename, text, confidence, bbox) VALUES ('QQ图片20260607183310.jpeg', '黑米粥', 0.9988, '[[1807.0, 473.0], [1912.0, 469.0], [1913.0, 511.0], [1808.0, 515.0]]');
INSERT INTO ocr_results (filename, text, confidence, bbox) VALUES ('QQ图片20260607183310.jpeg', '元', 0.9916, '[[750.0, 511.0], [788.0, 511.0], [788.0, 556.0], [750.0, 556.0]]');
INSERT INTO ocr_results (filename, text, confidence, bbox) VALUES ('QQ图片20260607183310.jpeg', '南瓜饼', 0.9996, '[[865.0, 515.0], [978.0, 513.0], [979.0, 552.0], [866.0, 554.0]]');
INSERT INTO ocr_results (filename, text, confidence, bbox) VALUES ('QQ图片20260607183310.jpeg', '2元', 0.9979, '[[1091.0, 511.0], [1166.0, 511.0], [1166.0, 551.0], [1091.0, 551.0]]');
INSERT INTO ocr_results (filename, text, confidence, bbox) VALUES ('QQ图片20260607183310.jpeg', '青椒鸡蛋饼', 0.9982, '[[1275.0, 512.0], [1455.0, 510.0], [1455.0, 547.0], [1275.0, 549.0]]');
INSERT INTO ocr_results (filename, text, confidence, bbox) VALUES ('QQ图片20260607183310.jpeg', '3元', 0.9987, '[[1497.0, 507.0], [1570.0, 507.0], [1570.0, 548.0], [1497.0, 548.0]]');
INSERT INTO ocr_results (filename, text, confidence, bbox) VALUES ('QQ图片20260607183310.jpeg', '麻油青菜包', 0.9938, '[[440.0, 520.0], [632.0, 517.0], [632.0, 555.0], [440.0, 558.0]]');
INSERT INTO ocr_results (filename, text, confidence, bbox) VALUES ('QQ图片20260607183310.jpeg', '1.5元', 0.9613, '[[682.0, 519.0], [762.0, 519.0], [762.0, 554.0], [682.0, 554.0]]');
INSERT INTO ocr_results (filename, text, confidence, bbox) VALUES ('QQ图片20260607183310.jpeg', '3.5元', 0.9950, '[[1502.0, 547.0], [1607.0, 547.0], [1607.0, 585.0], [1502.0, 585.0]]');
INSERT INTO ocr_results (filename, text, confidence, bbox) VALUES ('QQ图片20260607183310.jpeg', '南瓜红枣', 0.9279, '[[1813.0, 539.0], [1919.0, 537.0], [1919.0, 576.0], [1814.0, 578.0]]');
INSERT INTO ocr_results (filename, text, confidence, bbox) VALUES ('QQ图片20260607183310.jpeg', '鲜肉大包', 0.9985, '[[437.0, 558.0], [595.0, 556.0], [595.0, 596.0], [437.0, 599.0]]');
INSERT INTO ocr_results (filename, text, confidence, bbox) VALUES ('QQ图片20260607183310.jpeg', '1.5元', 0.9975, '[[678.0, 554.0], [790.0, 551.0], [791.0, 592.0], [679.0, 596.0]]');
INSERT INTO ocr_results (filename, text, confidence, bbox) VALUES ('QQ图片20260607183310.jpeg', '糖饼', 0.9996, '[[865.0, 553.0], [944.0, 553.0], [944.0, 594.0], [865.0, 594.0]]');
INSERT INTO ocr_results (filename, text, confidence, bbox) VALUES ('QQ图片20260607183310.jpeg', '2元', 0.9984, '[[1093.0, 550.0], [1169.0, 550.0], [1169.0, 590.0], [1093.0, 590.0]]');
INSERT INTO ocr_results (filename, text, confidence, bbox) VALUES ('QQ图片20260607183310.jpeg', '土豆丝卷饼', 0.9964, '[[1277.0, 551.0], [1457.0, 551.0], [1457.0, 585.0], [1277.0, 585.0]]');
INSERT INTO ocr_results (filename, text, confidence, bbox) VALUES ('QQ图片20260607183310.jpeg', '已消可使排', 0.5751, '[[439.0, 758.0], [535.0, 755.0], [535.0, 775.0], [439.0, 777.0]]');
