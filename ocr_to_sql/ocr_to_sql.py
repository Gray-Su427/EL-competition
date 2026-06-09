import os
import glob
from paddleocr import PaddleOCR

# ============ 配置区 ============
IMAGE_FOLDER = "images"          # 存放图片的子文件夹名（与脚本同级）
OUTPUT_SQL = "ocr_results.sql"   # 输出 SQL 文件名
# ================================

# 支持的图片后缀
EXTENSIONS = ("*.jpg", "*.jpeg", "*.png", "*.bmp")

# 收集文件夹内所有图片路径
image_paths = []
for ext in EXTENSIONS:
    image_paths.extend(glob.glob(os.path.join(IMAGE_FOLDER, ext)))
# 不区分大小写 (Windows 不敏感，但为了跨平台严谨)
image_paths.extend(glob.glob(os.path.join(IMAGE_FOLDER, "*.JPG")))
image_paths.extend(glob.glob(os.path.join(IMAGE_FOLDER, "*.JPEG")))

if not image_paths:
    print(f"在文件夹 '{IMAGE_FOLDER}' 中没有找到任何图片文件。")
    exit()

print(f"共找到 {len(image_paths)} 张图片，开始识别...")

# 初始化 OCR（只初始化一次）
ocr = PaddleOCR(lang='ch', use_angle_cls=True)

# 存储所有识别结果
all_results = []  # 每个元素: (filename, text, confidence, bbox_str)

for idx, img_path in enumerate(image_paths, 1):
    filename = os.path.basename(img_path)
    print(f"[{idx}/{len(image_paths)}] 正在识别: {filename}")

    result = ocr.ocr(img_path)
    if result and result[0]:
        for line in result[0]:
            bbox, (text, confidence) = line[0], line[1]
            # 转义单引号，避免 SQL 注入问题
            text_escaped = text.replace("'", "''")
            bbox_str = str(bbox)
            all_results.append((filename, text_escaped, round(confidence, 4), bbox_str))
    else:
        # 没有识别到文字也记录一条空文本，方便知道这张图处理过
        all_results.append((filename, "", 0.0, "[]"))

# 写入 SQL 文件
with open(OUTPUT_SQL, "w", encoding="utf-8") as f:
    # 建表语句（含自增主键和图片文件名）
    f.write("-- OCR 识别结果\n")
    f.write("CREATE TABLE IF NOT EXISTS ocr_results (\n")
    f.write("    id INT AUTO_INCREMENT PRIMARY KEY,\n")
    f.write("    filename VARCHAR(255),\n")
    f.write("    text TEXT,\n")
    f.write("    confidence FLOAT,\n")
    f.write("    bbox TEXT\n")
    f.write(");\n\n")

    for (filename, text, conf, bbox) in all_results:
        f.write(f"INSERT INTO ocr_results (filename, text, confidence, bbox) "
                f"VALUES ('{filename}', '{text}', {conf:.4f}, '{bbox}');\n")

print(f"识别完成！结果已写入 {OUTPUT_SQL}，共 {len(all_results)} 条记录。")
