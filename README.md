# Women Day Slideshow

Ứng dụng trình chiếu slideshow cho ngày Quốc tế Phụ nữ 8/3 (và 20/10). Được thiết kế để chiếu trên màn hình lớn tại công ty, kết hợp ảnh team nữ với lời chúc từ đồng nghiệp.

## Demo

**[Xem Demo trực tuyến](https://anlvdt.github.io/women-day-slideshow/public/demo-index.html)** — Chạy trực tiếp trên trình duyệt, không cần cài đặt.

| Demo | Mô tả |
|------|-------|
| [Slideshow](https://anlvdt.github.io/women-day-slideshow/public/demo.html) | Fullscreen slideshow với Ken Burns, transition, particles, petals |
| [Gửi lời chúc](https://anlvdt.github.io/women-day-slideshow/public/demo-submit.html) | Form gửi lời chúc với SVG icon picker, preview realtime |
| [Admin Panel](https://anlvdt.github.io/women-day-slideshow/public/demo-admin.html) | Quản lý ảnh, nhạc, cài đặt — mock data |

Các trang production (`index.html`, `submit.html`, `admin.html`) kết nối Firebase Firestore và cần cấu hình riêng.

## Tính năng

- Slideshow fullscreen với 8 hiệu ứng chuyển cảnh + 8 hiệu ứng Ken Burns
- Animated intro/outro slides với gradient background và sparkle particles
- Heart particles (Canvas) + falling petals (CSS animation)
- Playlist nhạc nền (YouTube + MP3), drag reorder
- Upload ảnh với auto-compression (Canvas API, max 1920px, JPEG 80%)
- Drag & drop sắp xếp thứ tự ảnh
- Tìm và xóa ảnh trùng lặp
- Bulk select/delete ảnh
- Realtime sync (Firestore onSnapshot) — ảnh/lời chúc mới tự động xuất hiện
- QR code overlay trên slideshow để mọi người gửi lời chúc
- Xuất video (WebM via captureStream)
- SVG icon picker cho lời chúc (thay emoji)
- Responsive, hoạt động trên mobile

## Tech Stack

- Vanilla JS (ES Modules, no bundler)
- Firebase Firestore (database) + Storage (ảnh, nhạc)
- Firebase Hosting (hoặc bất kỳ static hosting nào)
- Google Fonts (Great Vibes, Dancing Script)
- Vitest + fast-check (unit + property-based tests)

---

## Yêu cầu hệ thống

- [Node.js](https://nodejs.org/) >= 18 (chỉ cần cho testing)
- Tài khoản [Firebase](https://console.firebase.google.com/) (free tier đủ dùng)
- Trình duyệt hiện đại (Chrome, Firefox, Safari, Edge)

---

## Cài đặt từng bước

### 1. Clone repo

```bash
git clone https://github.com/anlvdt/women-day-slideshow.git
cd women-day-slideshow
```

### 2. Cài dependencies (cho testing)

```bash
npm install
```

### 3. Tạo Firebase Project

1. Truy cập [Firebase Console](https://console.firebase.google.com/)
2. Bấm "Add project" → đặt tên (VD: `women-day-slideshow`)
3. Tắt Google Analytics (không cần) → Create project

### 4. Bật Firestore Database

1. Trong Firebase Console → Build → Firestore Database
2. Bấm "Create database"
3. Chọn location gần nhất (VD: `asia-southeast1` cho Việt Nam)
4. Chọn "Start in test mode" → Create

### 5. Bật Firebase Storage

1. Trong Firebase Console → Build → Storage
2. Bấm "Get started"
3. Chọn "Start in test mode" → Next → Done

### 6. Lấy Firebase Config

1. Trong Firebase Console → Project Settings (icon bánh răng) → General
2. Kéo xuống phần "Your apps" → bấm icon Web (`</>`)
3. Đặt nickname (VD: `slideshow-web`) → Register app
4. Copy đoạn `firebaseConfig` object

### 7. Cấu hình ứng dụng

```bash
# Tạo file cấu hình Firebase
cp public/js/firebase-config.example.js public/js/firebase-config.js
```

Mở `public/js/firebase-config.js` và thay thế các giá trị:

```javascript
const firebaseConfig = {
    apiKey: "AIzaSy...",              // Từ Firebase Console
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project",
    storageBucket: "your-project.firebasestorage.app",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abc123"
};
```

```bash
# Tạo file cấu hình admin password
cp public/js/admin-config.example.js public/js/admin-config.js
```

Mở `public/js/admin-config.js` và đặt mật khẩu admin:

```javascript
export const ADMIN_PASSWORD = "mat-khau-cua-ban";
```

### 8. Chạy tests (tùy chọn)

```bash
npm test
```

---

## Chạy trên localhost

Ứng dụng dùng ES Modules nên cần HTTP server (không mở file trực tiếp được).

### Cách 1: npx serve (nhanh nhất)

```bash
npx serve public
# Mở http://localhost:3000
```

### Cách 2: Python HTTP Server

```bash
cd public
python3 -m http.server 8080
# Mở http://localhost:8080
```

### Cách 3: VS Code Live Server

1. Cài extension "Live Server" trong VS Code
2. Click chuột phải vào `public/index.html` → "Open with Live Server"

### Cách 4: Firebase Emulator

```bash
npm install -g firebase-tools
firebase login
firebase init hosting  # Chọn project, public dir = "public"
firebase emulators:start --only hosting
# Mở http://localhost:5000
```

---

## Triển khai (Deploy)

### Firebase Hosting (khuyến nghị)

Firebase Hosting tích hợp tốt nhất vì ứng dụng đã dùng Firestore + Storage.

```bash
# Cài Firebase CLI (nếu chưa có)
npm install -g firebase-tools

# Đăng nhập
firebase login

# Liên kết project (chạy 1 lần)
firebase use --add
# Chọn project Firebase của bạn

# Deploy toàn bộ (hosting + firestore rules + storage rules)
npx firebase deploy

# Hoặc chỉ deploy hosting
npx firebase deploy --only hosting
```

Sau khi deploy, ứng dụng sẽ chạy tại: `https://your-project.web.app`

### Netlify

1. Đăng nhập [Netlify](https://app.netlify.com/)
2. Bấm "Add new site" → "Import an existing project"
3. Kết nối GitHub repo `women-day-slideshow`
4. Cấu hình build:
   - Build command: (để trống — không cần build)
   - Publish directory: `public`
5. Bấm "Deploy site"

Lưu ý: Với Netlify, bạn vẫn cần tạo `public/js/firebase-config.js` trước khi push. Hoặc dùng Netlify Environment Variables kết hợp build script.

Tạo file `netlify.toml` ở root:

```toml
[build]
  publish = "public"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### Vercel

1. Đăng nhập [Vercel](https://vercel.com/)
2. Bấm "Add New" → "Project" → Import GitHub repo
3. Cấu hình:
   - Framework Preset: Other
   - Root Directory: `public`
   - Build Command: (để trống)
   - Output Directory: `.`
4. Bấm "Deploy"

Hoặc dùng Vercel CLI:

```bash
npm install -g vercel
cd public
vercel
# Làm theo hướng dẫn
```

Tạo file `vercel.json` trong thư mục `public/`:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### GitHub Pages (chỉ demo)

GitHub Pages đã được bật cho repo này. Tuy nhiên, các trang production cần Firebase nên GitHub Pages chỉ phù hợp cho demo (các file `demo-*.html`).

---

## Hướng dẫn sử dụng

### Trang Admin (`admin.html`)

1. Truy cập trang admin, nhập mật khẩu đã cấu hình
2. **Upload ảnh**: Chọn ảnh từ máy (hỗ trợ chọn nhiều), thêm chú thích tùy chọn, bấm Upload. Ảnh tự động nén xuống max 1920px, JPEG 80%.
3. **Quản lý ảnh**: Kéo thả để sắp xếp thứ tự. Hover vào ảnh để thấy nút xóa. Dùng "Chọn nhiều" để xóa hàng loạt. "Tìm trùng lặp" để phát hiện ảnh trùng.
4. **Tối ưu ảnh cũ**: Bấm "Tối ưu ảnh cũ" để nén lại toàn bộ ảnh đã upload trước đó.
5. **Nhạc nền**: Thêm link YouTube hoặc upload file MP3. Kéo thả để sắp xếp thứ tự phát.
6. **Cài đặt slideshow**: Điều chỉnh thời gian hiển thị slide, thời gian chuyển cảnh, bật/tắt Ken Burns.
7. **Nội dung sự kiện**: Tùy chỉnh tiêu đề, phụ đề cho slide intro và outro.
8. **Xem trước**: Bấm "Xem trước" để preview slideshow ngay trong admin.
9. **Xuất video**: Bấm "Xuất video" để ghi lại slideshow thành file WebM.
10. **Quản lý lời chúc**: Xem và xóa lời chúc đã nhận.

### Trang Slideshow (`index.html`)

1. Mở trang slideshow trên màn hình lớn / TV
2. Bấm **F** hoặc nút Fullscreen để vào chế độ toàn màn hình
3. Bấm **Space** để play/pause
4. Bấm **N** để chuyển bài nhạc
5. Slideshow tự động chạy: Intro → Ảnh + Lời chúc → Outro → Lặp lại
6. QR code hiển thị ở góc để mọi người quét và gửi lời chúc
7. Ảnh/lời chúc mới được thêm sẽ tự động xuất hiện (realtime sync)

### Trang Gửi lời chúc (`submit.html`)

1. Chia sẻ link hoặc QR code cho đồng nghiệp
2. Nhập tên người gửi và lời chúc
3. Bấm icon picker để thêm SVG icon vào lời chúc
4. Xem trước lời chúc trước khi gửi
5. Bấm "Gửi lời chúc" — lời chúc sẽ xuất hiện trên slideshow realtime

### Phím tắt (trang Slideshow)

| Phím | Chức năng |
|------|-----------|
| `F` | Bật/tắt fullscreen |
| `Space` | Play/Pause slideshow + nhạc |
| `N` | Chuyển bài nhạc tiếp theo |
| `ESC` | Thoát fullscreen (tự động pause) |

---

## Slideshow Timing

Thời gian hiển thị slide có thể tùy chỉnh trong trang Admin. Giá trị mặc định:

| Thông số | Mặc định | Khuyến nghị | Ghi chú |
|----------|----------|-------------|---------|
| Thời gian slide | 8s | 5–8s (ảnh), 8–12s (có text) | Đủ để đọc lời chúc + ngắm ảnh |
| Thời gian chuyển cảnh | 1.5s | 1–2s | Mượt mà, không quá nhanh/chậm |
| Ken Burns duration | 9.5s (auto) | = slide + transition | Tự động tính, đảm bảo hiệu ứng liền mạch |
| Ken Burns | Bật | Bật | Tạo chuyển động sống động cho ảnh tĩnh |

---

## Cấu trúc project

```
women-day-slideshow/
├── public/                     # Thư mục deploy (static files)
│   ├── index.html              # Trang slideshow (fullscreen)
│   ├── submit.html             # Trang gửi lời chúc
│   ├── admin.html              # Trang quản lý
│   ├── demo-index.html         # Landing page demo (GitHub Pages)
│   ├── demo.html               # Demo slideshow offline
│   ├── demo-submit.html        # Demo form gửi lời chúc
│   ├── demo-admin.html         # Demo admin panel (mock data)
│   ├── favicon.svg
│   ├── css/
│   │   ├── slideshow.css       # Styles slideshow + effects
│   │   ├── admin.css           # Styles admin page
│   │   ├── submit.css          # Styles submit page
│   │   └── nav.css             # Shared navigation
│   └── js/
│       ├── main-slideshow.js   # Entry point slideshow page
│       ├── slideshow.js        # Slideshow engine + sanitizer
│       ├── music.js            # Playlist music (YT + MP3)
│       ├── particles.js        # Heart/star particle engine
│       ├── petals.js           # CSS falling petals
│       ├── admin.js            # Admin panel logic
│       ├── submit.js           # Submit form logic
│       ├── validator.js        # Input validation
│       ├── firebase-config.example.js  # Template cấu hình Firebase
│       └── admin-config.example.js     # Template mật khẩu admin
├── firebase.json               # Cấu hình Firebase Hosting
├── firestore.rules             # Security rules cho Firestore
├── storage.rules               # Security rules cho Storage
├── package.json
├── vitest.config.js
└── __mocks__/                  # Mock modules cho Vitest
```

## Firestore Collections

| Collection | Fields | Mô tả |
|-----------|--------|-------|
| `photos` | `photoUrl`, `caption`, `filename`, `createdAt` | Ảnh upload |
| `wishes` | `senderName`, `message`, `createdAt` | Lời chúc |
| `config/music` | `playlist[]` | Playlist nhạc nền |
| `config/slideshow` | `slideDuration`, `transitionDuration`, `enableKenBurns` | Cài đặt hiệu ứng |
| `config/event` | `introTitle`, `introSubtitle`, `introDate`, `outroTitle`, `outroSubtitle`, `outroTagline` | Nội dung intro/outro |
| `config/photoOrder` | `order[]` | Thứ tự ảnh tùy chỉnh |

---

## FAQ

**Q: Có cần Firebase Auth không?**
A: Không. Ứng dụng dùng client-side password gate cho admin. Phù hợp cho tool nội bộ công ty.

**Q: Free tier Firebase có đủ không?**
A: Đủ. Spark plan (free) cho phép 1GB Firestore, 5GB Storage, 10GB/tháng hosting bandwidth. Đủ cho vài trăm ảnh và hàng nghìn lời chúc.

**Q: Có cần build step không?**
A: Không. Ứng dụng dùng Vanilla JS + ES Modules, import Firebase SDK từ CDN. Chỉ cần static file server.

**Q: Sao slideshow không chạy khi mở file trực tiếp?**
A: ES Modules yêu cầu HTTP server. Dùng `npx serve public` hoặc bất kỳ static server nào.

**Q: Làm sao đổi mật khẩu admin?**
A: Sửa giá trị `ADMIN_PASSWORD` trong file `public/js/admin-config.js`.

**Q: Ảnh upload ở đâu?**
A: Firebase Storage, thư mục `photos/`. Ảnh tự động nén trước khi upload.

**Q: Có thể dùng cho ngày 20/10 không?**
A: Có. Vào Admin → Nội dung sự kiện → đổi tiêu đề, phụ đề, ngày hiển thị.

---

## License

MIT
