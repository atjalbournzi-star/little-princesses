import shutil
import os

src = 'little_princesses.db'
dst_dir = os.path.join('dist', 'Little_Princesses_ERP')
os.makedirs(dst_dir, exist_ok=True)
dst = os.path.join(dst_dir, 'little_princesses.db')

shutil.copy2(src, dst)
print("Copied pre-seeded little_princesses.db to dist/Little_Princesses_ERP/ successfully!")
