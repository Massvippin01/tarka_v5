import os
from PIL import Image
import numpy as np

def run():
    im = Image.open('frontend/public/brand/tarka-logo-full.png')
    arr = np.array(im)
    alpha = arr[:, :, 3]

    fg_mask = alpha > 40
    r = arr[:, :, 0].astype(float)
    g = arr[:, :, 1].astype(float)
    b = arr[:, :, 2].astype(float)

    is_terracotta = (r > 120) & (r > g * 1.3) & (r > b * 1.5) & fg_mask
    is_dark_brown = fg_mask & ~is_terracotta

    print('Terracotta pixels count:', np.sum(is_terracotta))
    print('Dark brown pixels count:', np.sum(is_dark_brown))

    # Dark theme variant: dark brown -> warm ivory #FFFDF8
    dark_arr = arr.copy()
    dark_arr[is_dark_brown, 0] = 255
    dark_arr[is_dark_brown, 1] = 253
    dark_arr[is_dark_brown, 2] = 248

    dark_arr[is_terracotta, 0] = np.clip(dark_arr[is_terracotta, 0].astype(int) + 20, 0, 255)
    dark_arr[is_terracotta, 1] = np.clip(dark_arr[is_terracotta, 1].astype(int) + 15, 0, 255)
    dark_arr[is_terracotta, 2] = np.clip(dark_arr[is_terracotta, 2].astype(int) + 10, 0, 255)

    dark_logo = Image.fromarray(dark_arr)
    dark_logo.save('frontend/public/brand/tarka-logo-dark.png')
    dark_logo.save('frontend/public/tarka-logo-dark.png')
    dark_logo.save('frontend/src/assets/brand/tarka-logo-dark.png')

    # Square symbol
    im_sym = Image.open('frontend/public/brand/tarka-symbol.png')
    arr_sym = np.array(im_sym)
    a_sym = arr_sym[:, :, 3]
    fg_sym = a_sym > 40
    r_s = arr_sym[:, :, 0].astype(float)
    g_s = arr_sym[:, :, 1].astype(float)
    b_s = arr_sym[:, :, 2].astype(float)
    tc_sym = (r_s > 120) & (r_s > g_s * 1.3) & (r_s > b_s * 1.5) & fg_sym
    db_sym = fg_sym & ~tc_sym

    dark_sym_arr = arr_sym.copy()
    dark_sym_arr[db_sym, 0] = 255
    dark_sym_arr[db_sym, 1] = 253
    dark_sym_arr[db_sym, 2] = 248
    dark_sym_arr[tc_sym, 0] = np.clip(dark_sym_arr[tc_sym, 0].astype(int) + 20, 0, 255)
    dark_sym_arr[tc_sym, 1] = np.clip(dark_sym_arr[tc_sym, 1].astype(int) + 15, 0, 255)
    dark_sym_arr[tc_sym, 2] = np.clip(dark_sym_arr[tc_sym, 2].astype(int) + 10, 0, 255)

    dark_symbol = Image.fromarray(dark_sym_arr)
    dark_symbol.save('frontend/public/brand/tarka-symbol-dark.png')
    dark_symbol.save('frontend/public/tarka-icon-dark.png')
    dark_symbol.save('frontend/src/assets/brand/tarka-symbol-dark.png')

    if os.path.exists('frontend/public/tarka-icon.svg'):
        with open('frontend/public/tarka-icon.svg', 'r', encoding='utf-8') as f:
            svg_content = f.read()
        dark_svg = svg_content.replace('fill="#2B1E16"', 'fill="#FFFDF8"').replace('fill="#1A1918"', 'fill="#FFFDF8"')
        with open('frontend/public/tarka-icon-dark.svg', 'w', encoding='utf-8') as f:
            f.write(dark_svg)
        print('Created frontend/public/tarka-icon-dark.svg')

    # Synchronize to root brand/ directory for backend PDF reports and packaging
    import shutil
    shutil.copyfile('frontend/public/brand/tarka-logo-full.png', 'brand/tarka-logo.png')
    shutil.copyfile('frontend/public/brand/tarka-symbol.png', 'brand/tarka-icon.png')
    shutil.copyfile('frontend/public/brand/tarka-logo-dark.png', 'brand/tarka-logo-dark.png')
    shutil.copyfile('frontend/public/brand/tarka-symbol-dark.png', 'brand/tarka-icon-dark.png')
    shutil.copyfile('frontend/public/favicon.ico', 'brand/favicon.ico')
    print('Synchronized official brand assets to root brand/ directory!')

    print('Successfully generated dark theme brand assets!')

if __name__ == '__main__':
    run()
