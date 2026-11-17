# domains/tailoring/subpixel_a4_detector.py
# High-precision Sub-Pixel A4 Paper Corner Detector with Geometric Sanity Guard
# Architecture Standard: Rule 1 & 3 (< 220 lines, zero regressions)

import io
import math
from collections import deque
import numpy as np
from PIL import Image


def _refine_corner_subpixel(gray: np.ndarray, x0: float, y0: float, win_size: int = 7) -> tuple[float, float]:
    """Refines corner position using orthogonal gradient covariance matrix (cornerSubPix equivalent)."""
    h, w = gray.shape
    ix0, iy0 = int(round(x0)), int(round(y0))
    half = win_size // 2

    if ix0 - half - 1 < 0 or ix0 + half + 2 >= w or iy0 - half - 1 < 0 or iy0 + half + 2 >= h:
        return float(x0), float(y0)

    sub = gray[iy0 - half - 1:iy0 + half + 2, ix0 - half - 1:ix0 + half + 2].astype(np.float32)
    gx = (sub[1:-1, 2:] - sub[1:-1, :-2]) * 0.5
    gy = (sub[2:, 1:-1] - sub[:-2, 1:-1]) * 0.5
    y_coords, x_coords = np.mgrid[-half:half + 1, -half:half + 1]

    a = float(np.sum(gx * gx))
    b = float(np.sum(gx * gy))
    c = float(np.sum(gy * gy))
    det = a * c - b * b
    if abs(det) < 1e-6:
        return float(x0), float(y0)

    bb1 = float(np.sum(gx * gx * x_coords + gx * gy * y_coords))
    bb2 = float(np.sum(gx * gy * x_coords + gy * gy * y_coords))
    dx = max(-half, min(half, (c * bb1 - b * bb2) / det))
    dy = max(-half, min(half, (a * bb2 - b * bb1) / det))
    return round(float(x0 + dx), 2), round(float(y0 + dy), 2)


def _check_quad_angles(corners: list[tuple[float, float]]) -> bool:
    """Ensures all 4 quad angles are strictly between 70 and 110 degrees."""
    for i in range(4):
        c = corners[i]
        p = corners[(i + 3) % 4]
        n = corners[(i + 1) % 4]
        v1 = (p[0] - c[0], p[1] - c[1])
        v2 = (n[0] - c[0], n[1] - c[1])
        m1 = math.hypot(v1[0], v1[1])
        m2 = math.hypot(v2[0], v2[1])
        if m1 < 1e-3 or m2 < 1e-3:
            return False
        cos_val = (v1[0] * v2[0] + v1[1] * v2[1]) / (m1 * m2)
        if abs(cos_val) > 0.36:
            return False
    return True


def detect_a4_corners_subpixel(image_input) -> dict:
    """Detects genuine A4 sheet 4 corners on mobile phone image with strict geometric sanity guard."""
    try:
        if isinstance(image_input, Image.Image):
            pil_img = image_input.convert('RGB')
        else:
            pil_img = Image.open(io.BytesIO(image_input)).convert('RGB')
        orig_w, orig_h = pil_img.size
        max_dim = 1000
        scale = min(1.0, max_dim / max(orig_w, orig_h))
        sw = max(100, int(orig_w * scale))
        sh = max(100, int(orig_h * scale))

        small_img = pil_img.resize((sw, sh), Image.Resampling.BILINEAR) if scale < 1.0 else pil_img
        arr = np.array(small_img, dtype=np.float32)
        r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
        gray = 0.299 * r + 0.587 * g + 0.114 * b
        max_c = np.maximum(np.maximum(r, g), b)
        min_c = np.minimum(np.minimum(r, g), b)
        sat = np.where(max_c > 0, ((max_c - min_c) / np.maximum(max_c, 1e-4)) * 100.0, 0.0)
        rgb_diff = np.maximum(np.abs(r - g), np.maximum(np.abs(r - b), np.abs(g - b)))

        # Strict Achromatic & High Luminance Paper Mask (Low Saturation & Pure Neutral)
        white_mask = (gray >= 165) & (rgb_diff <= 14) & (sat <= 20)

        # Clear background connected to image borders
        border_mask = np.zeros((sh, sw), dtype=bool)
        bq = deque()
        for x in range(sw):
            if white_mask[0, x] and not border_mask[0, x]: bq.append((0, x)); border_mask[0, x] = True
            if white_mask[sh - 1, x] and not border_mask[sh - 1, x]: bq.append((sh - 1, x)); border_mask[sh - 1, x] = True
        for y in range(sh):
            if white_mask[y, 0] and not border_mask[y, 0]: bq.append((y, 0)); border_mask[y, 0] = True
            if white_mask[y, sw - 1] and not border_mask[y, sw - 1]: bq.append((y, sw - 1)); border_mask[y, sw - 1] = True

        while bq:
            cy, cx = bq.popleft()
            for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
                if 0 <= ny < sh and 0 <= nx < sw and not border_mask[ny, nx] and white_mask[ny, nx]:
                    border_mask[ny, nx] = True
                    bq.append((ny, nx))

        clean_mask = white_mask & (~border_mask)
        tot_px = sw * sh
        min_area = int(tot_px * 0.025)  # Strict geometric requirement: >= 2.5% image area

        # Connected Component Labeling via BFS
        visited = np.zeros((sh, sw), dtype=bool)
        best_corners_small = None
        best_score = -1.0

        for sy in range(3, sh - 3):
            for sx in range(3, sw - 3):
                if clean_mask[sy, sx] and not visited[sy, sx]:
                    q = deque([(sy, sx)])
                    visited[sy, sx] = True
                    cluster_x = []
                    cluster_y = []
                    l_sum, l_sq_sum = 0.0, 0.0

                    while q:
                        cy, cx = q.popleft()
                        cluster_x.append(cx)
                        cluster_y.append(cy)
                        val = float(gray[cy, cx])
                        l_sum += val
                        l_sq_sum += val * val
                        for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
                            if 0 <= ny < sh and 0 <= nx < sw and clean_mask[ny, nx] and not visited[ny, nx]:
                                visited[ny, nx] = True
                                q.append((ny, nx))

                    c_len = len(cluster_x)
                    if min_area <= c_len <= int(tot_px * 0.45):
                        variance = (l_sq_sum / c_len) - ((l_sum / c_len) ** 2)
                        if variance < 550:
                            xs = np.array(cluster_x, dtype=np.float32)
                            ys = np.array(cluster_y, dtype=np.float32)
                            # PCA Oriented Bounding Rectangle for Extreme Outer Corners
                            cx = float(np.mean(xs))
                            cy = float(np.mean(ys))
                            dx, dy = xs - cx, ys - cy
                            cov = np.cov(dx, dy)
                            eigvals, eigvecs = np.linalg.eigh(cov)
                            v1, v2 = eigvecs[:, 1], eigvecs[:, 0]
                            p1 = dx * v1[0] + dy * v1[1]
                            p2 = dx * v2[0] + dy * v2[1]
                            min1, max1 = float(np.percentile(p1, 0.4)), float(np.percentile(p1, 99.6))
                            min2, max2 = float(np.percentile(p2, 0.4)), float(np.percentile(p2, 99.6))
                            raw_cand = [
                                (cx + min1 * v1[0] + min2 * v2[0], cy + min1 * v1[1] + min2 * v2[1]),
                                (cx + max1 * v1[0] + min2 * v2[0], cy + max1 * v1[1] + min2 * v2[1]),
                                (cx + max1 * v1[0] + max2 * v2[0], cy + max1 * v1[1] + max2 * v2[1]),
                                (cx + min1 * v1[0] + max2 * v2[0], cy + min1 * v1[1] + max2 * v2[1]),
                            ]
                            cand_sorted = sorted(raw_cand, key=lambda p: math.atan2(p[1] - cy, p[0] - cx))
                            tl_idx = min(range(4), key=lambda i: cand_sorted[i][0] + cand_sorted[i][1])
                            cand = [cand_sorted[(tl_idx + i) % 4] for i in range(4)]
                            tl, tr, br, bl = cand[0], cand[1], cand[2], cand[3]

                            # Minimum edge length in native full-res >= 70 px
                            e0 = math.hypot(tr[0] - tl[0], tr[1] - tl[1]) / scale
                            e1 = math.hypot(br[0] - tr[0], br[1] - tr[1]) / scale
                            e2 = math.hypot(br[0] - bl[0], br[1] - bl[1]) / scale
                            e3 = math.hypot(bl[0] - tl[0], bl[1] - tl[1]) / scale
                            min_edge = min(e0, e1, e2, e3)

                            if min_edge >= 70.0 and _check_quad_angles(cand):
                                avg_w = (e0 + e2) * 0.5
                                avg_h = (e1 + e3) * 0.5
                                aspect = max(avg_w, avg_h) / max(1.0, min(avg_w, avg_h))
                                if 1.15 <= aspect <= 1.85:
                                    score = c_len / (1.0 + abs(aspect - 1.414) * 2.0)
                                    if score > best_score:
                                        best_score = score
                                        best_corners_small = cand

        if not best_corners_small:
            return {'success': False, 'error': 'لم يتم العثور على ورقة A4 واضحة بنسبة مساحة >= 2.5%'}

        full_gray = np.array(pil_img.convert('L'), dtype=np.float32)
        inv_scale = 1.0 / scale
        refined = []
        for sx, sy in best_corners_small:
            rx, ry = _refine_corner_subpixel(full_gray, sx * inv_scale, sy * inv_scale, win_size=9)
            refined.append({'x': rx, 'y': ry})

        tw = math.hypot(refined[1]['x'] - refined[0]['x'], refined[1]['y'] - refined[0]['y'])
        sh_dim = math.hypot(refined[3]['x'] - refined[0]['x'], refined[3]['y'] - refined[0]['y'])
        orientation = 'landscape' if tw > sh_dim * 1.06 else 'portrait'

        return {
            'success': True,
            'corners': refined,
            'orientation': orientation,
            'subpixel_precision': True,
            'dimensions': {'orig_width': orig_w, 'orig_height': orig_h}
        }
    except Exception as ex:
        return {'success': False, 'error': f'خطأ أثناء معالجة الكشف الدقيق: {str(ex)}'}
