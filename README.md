# Team Photo Composer

A browser-only tool for merging several team group photos into one exportable PNG.

## Features

- Upload multiple local photos.
- Reorder photos by dragging thumbnails.
- Choose layouts: horizontal, vertical, grid, or three-team pin layout.
- Use the pin layout for three teams: one photo on top, two photos side by side below.
- Adjust the top photo height ratio in pin layout.
- Choose whether photos are fully visible or cropped to fill each slot.
- Fine-tune each photo independently with scale, horizontal offset, and vertical offset.
- Add, select, move, edit, and delete text overlays.
- Export the final composition as a PNG.

## Run Locally

This project has no build step and no runtime dependencies.

Open `index.html` directly in a browser, or serve the folder locally:

```bash
python3 -m http.server 8791
```

Then visit:

```text
http://127.0.0.1:8791/index.html
```

## Usage

1. Click **添加团队合照** and select the team photos.
2. Use **合照顺序** to drag photos into the desired order.
3. Pick **品字型** for three teams.
4. Adjust **品字上图高度** if the top/bottom balance needs tuning.
5. Click a thumbnail and use **照片微调** to adjust that specific photo.
6. Add or edit text in the **文字** panel.
7. Click **下载 PNG** to export.

## Privacy

All image processing happens in the browser with HTML canvas. Uploaded photos are not sent to a server.
