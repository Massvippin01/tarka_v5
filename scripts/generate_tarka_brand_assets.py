import os
import cv2
import numpy as np
from PIL import Image

def generate_assets():
    src_path = 'C:/Users/Administrator/.gemini/antigravity/brain/915dc6ec-ddde-403a-80da-cba89a31ec35/.user_uploaded/media_1795631015441_f471bdd4.jpg'
    img = cv2.imread(src_path)
    rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    bg = np.array([250, 245, 226], dtype=np.float32)
    dist = np.linalg.norm(rgb.astype(np.float32) - bg, axis=2)

    dark_mask = ((rgb[:, :, 0] < 100) & (rgb[:, :, 1] < 70) & (rgb[:, :, 2] < 60) & (dist > 40)).astype(np.uint8) * 255
    terra_mask = ((rgb[:, :, 0] > 120) & (rgb[:, :, 1] > 50) & (rgb[:, :, 1] < 140) & (rgb[:, :, 2] < 110) & (dist > 40)).astype(np.uint8) * 255

    os.makedirs('brand', exist_ok=True)
    os.makedirs('frontend/public', exist_ok=True)
    os.makedirs('frontend/src/assets', exist_ok=True)

    cnts_dark, hier_dark = cv2.findContours(dark_mask, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_TC89_KCOS)
    cnts_terra, hier_terra = cv2.findContours(terra_mask, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_TC89_KCOS)

    min_x, max_x = 110, 920
    min_y, max_y = 180, 372
    width = max_x - min_x
    height = max_y - min_y

    def cnt_to_subpath(cnt, ox=min_x, oy=min_y, scale=1.0, tx=0, ty=0):
        approx = cv2.approxPolyDP(cnt, 0.7, True)
        pts = approx.reshape(-1, 2)
        if len(pts) == 0:
            return ''
        x0 = round((pts[0][0] - ox) * scale + tx, 2)
        y0 = round((pts[0][1] - oy) * scale + ty, 2)
        d = f'M {x0} {y0}'
        for p in pts[1:]:
            xp = round((p[0] - ox) * scale + tx, 2)
            yp = round((p[1] - oy) * scale + ty, 2)
            d += f' L {xp} {yp}'
        d += ' Z'
        return d

    dark_subpaths = [cnt_to_subpath(c) for c in cnts_dark if cv2.contourArea(c) > 30]
    terra_subpaths = [cnt_to_subpath(c) for c in cnts_terra if cv2.contourArea(c) > 20]

    full_dark_d = ' '.join(dark_subpaths)
    full_terra_d = ' '.join(terra_subpaths)

    # 1. Full horizontal logo (light background / warm ivory)
    logo_svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" width="{width}" height="{height}" fill="none">
  <path fill="#2B1E16" fill-rule="evenodd" d="{full_dark_d}" />
  <path fill="#C35B34" fill-rule="evenodd" d="{full_terra_d}" />
</svg>'''

    with open('brand/tarka-logo.svg', 'w', encoding='utf-8') as f:
        f.write(logo_svg)
    with open('frontend/public/tarka-logo.svg', 'w', encoding='utf-8') as f:
        f.write(logo_svg)
    with open('frontend/src/assets/tarka-logo.svg', 'w', encoding='utf-8') as f:
        f.write(logo_svg)

    # 2. Full horizontal logo (dark background)
    logo_dark_svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" width="{width}" height="{height}" fill="none">
  <path fill="#F8F4ED" fill-rule="evenodd" d="{full_dark_d}" />
  <path fill="#D46B44" fill-rule="evenodd" d="{full_terra_d}" />
</svg>'''

    with open('brand/tarka-logo-dark.svg', 'w', encoding='utf-8') as f:
        f.write(logo_dark_svg)
    with open('frontend/public/tarka-logo-dark.svg', 'w', encoding='utf-8') as f:
        f.write(logo_dark_svg)
    with open('frontend/src/assets/tarka-logo-dark.svg', 'w', encoding='utf-8') as f:
        f.write(logo_dark_svg)

    # 3. Standalone mark / icon (symbol only)
    # Mark bounds: x in [113, 356], y in [184, 368]
    mark_min_x, mark_max_x = 113, 356
    mark_min_y, mark_max_y = 184, 368
    mark_w = mark_max_x - mark_min_x
    mark_h = mark_max_y - mark_min_y

    icon_size = 256
    pad = 28
    target_inner = icon_size - 2 * pad
    icon_scale = target_inner / max(mark_w, mark_h)
    icon_tx = pad + (target_inner - mark_w * icon_scale) / 2
    icon_ty = pad + (target_inner - mark_h * icon_scale) / 2

    mark_dark_subpaths = [cnt_to_subpath(c, ox=mark_min_x, oy=mark_min_y, scale=icon_scale, tx=icon_tx, ty=icon_ty)
                          for c in cnts_dark if cv2.contourArea(c) > 30 and cv2.boundingRect(c)[0] < 360]
    mark_terra_subpaths = [cnt_to_subpath(c, ox=mark_min_x, oy=mark_min_y, scale=icon_scale, tx=icon_tx, ty=icon_ty)
                           for c in cnts_terra if cv2.contourArea(c) > 20 and cv2.boundingRect(c)[0] < 360]

    icon_dark_d = ' '.join(mark_dark_subpaths)
    icon_terra_d = ' '.join(mark_terra_subpaths)

    icon_svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {icon_size} {icon_size}" width="{icon_size}" height="{icon_size}" fill="none">
  <path fill="#2B1E16" fill-rule="evenodd" d="{icon_dark_d}" />
  <path fill="#C35B34" fill-rule="evenodd" d="{icon_terra_d}" />
</svg>'''

    icon_dark_bg_svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {icon_size} {icon_size}" width="{icon_size}" height="{icon_size}" fill="none">
  <path fill="#F8F4ED" fill-rule="evenodd" d="{icon_dark_d}" />
  <path fill="#D46B44" fill-rule="evenodd" d="{icon_terra_d}" />
</svg>'''

    with open('brand/tarka-icon.svg', 'w', encoding='utf-8') as f:
        f.write(icon_svg)
    with open('brand/tarka-icon-dark.svg', 'w', encoding='utf-8') as f:
        f.write(icon_dark_bg_svg)
    with open('frontend/public/favicon.svg', 'w', encoding='utf-8') as f:
        f.write(icon_svg)
    with open('frontend/public/tarka-icon.svg', 'w', encoding='utf-8') as f:
        f.write(icon_svg)
    with open('frontend/src/assets/tarka-icon.svg', 'w', encoding='utf-8') as f:
        f.write(icon_svg)

    # Export PNGs directly from raster crop with transparency
    # Clean transparent image of the cropped logo
    crop_rgb = rgb[min_y:max_y, min_x:max_x]
    crop_dist = dist[min_y:max_y, min_x:max_x]

    # Create RGBA
    alpha = np.clip((crop_dist - 15) / 25.0 * 255, 0, 255).astype(np.uint8)
    # Blend color for clean anti-aliasing
    rgba = np.dstack([crop_rgb, alpha])
    logo_png = Image.fromarray(rgba, 'RGBA')
    logo_png.save('brand/tarka-logo.png')
    logo_png.save('frontend/public/tarka-logo.png')

    # Crop mark only
    mark_crop_rgb = rgb[mark_min_y:mark_max_y, mark_min_x:mark_max_x]
    mark_crop_dist = dist[mark_min_y:mark_max_y, mark_min_x:mark_max_x]
    mark_alpha = np.clip((mark_crop_dist - 15) / 25.0 * 255, 0, 255).astype(np.uint8)
    mark_rgba = np.dstack([mark_crop_rgb, mark_alpha])
    mark_png = Image.fromarray(mark_rgba, 'RGBA')

    # Fit into 256x256 and 512x512 with padding
    for sz in [16, 32, 48, 64, 128, 256, 512]:
        canvas = Image.new('RGBA', (sz, sz), (0, 0, 0, 0))
        scale = (sz * 0.8) / max(mark_png.width, mark_png.height)
        nw, nh = max(1, int(mark_png.width * scale)), max(1, int(mark_png.height * scale))
        resized = mark_png.resize((nw, nh), Image.LANCZOS)
        canvas.paste(resized, ((sz - nw) // 2, (sz - nh) // 2), resized)
        if sz == 256:
            canvas.save('brand/tarka-icon-256.png')
            canvas.save('frontend/public/tarka-icon.png')
        elif sz == 512:
            canvas.save('brand/tarka-icon-512.png')

    # Multi-resolution ICO file for favicon
    ico_images = []
    for sz in [16, 32, 48, 64]:
        canvas = Image.new('RGBA', (sz, sz), (0, 0, 0, 0))
        scale = (sz * 0.85) / max(mark_png.width, mark_png.height)
        nw, nh = max(1, int(mark_png.width * scale)), max(1, int(mark_png.height * scale))
        resized = mark_png.resize((nw, nh), Image.LANCZOS)
        canvas.paste(resized, ((sz - nw) // 2, (sz - nh) // 2), resized)
        ico_images.append(canvas)
    ico_images[0].save('frontend/public/favicon.ico', format='ICO', sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
    ico_images[0].save('brand/favicon.ico', format='ICO', sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])

    print('All brand assets successfully generated!')

if __name__ == '__main__':
    generate_assets()
