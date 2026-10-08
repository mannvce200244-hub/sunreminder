# Đưa SunReminder lên Cloudflare miễn phí

Bản triển khai Cloudflare được bổ sung ngày 08/10/2026. Windows EXE và máy chủ Node.js cục bộ vẫn dùng như trước. GitHub chứa mã nguồn; cần hoàn thành triển khai bên dưới mới có app online.

## 1. Điền màn hình Create application

Kết nối kho GitHub `mannvce200244-hub/sunreminder`, nhánh `main`. Mã nguồn cần có `wrangler.jsonc`, `package.json` ở gốc và thư mục `cloudflare`.

| Ô trên Cloudflare | Giá trị |
|---|---|
| Project/Worker name | `sunreminder` |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |
| Enable Preview builds | Tắt trong lần thiết lập này |
| Preview command | Giữ mặc định, không dùng khi preview tắt |
| Protect with Cloudflare Access | Tắt để người tham gia mở app; `/admin` vẫn có đăng nhập riêng |
| Advanced settings → Root directory | Giữ mặc định tại gốc kho, không đổi sang `web` |
| Production branch | `main` |

Chọn gói Workers Free. Bấm Deploy và chờ build hoàn tất. Gói miễn phí có hạn mức; kiểm tra bảng Usage trên tài khoản khi dùng thật.

Wrangler đã được cố định phiên bản trong package-lock.json. Build chỉ chép 21 file giao diện được cho phép vào thư mục công khai, không chép mật khẩu, SQLite hay mã nguồn máy chủ. Cấu hình D1 có binding `DB`; Wrangler hỗ trợ tự tạo database `sunreminder-db` khi triển khai lần đầu và liên kết lại ở các lần triển khai tiếp theo. Không cần tự tạo bảng SQL: Worker tạo bảng rỗng khi API được sử dụng lần đầu sau khi có mật khẩu.

Nguồn: [Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/), [tự tạo D1](https://developers.cloudflare.com/changelog/post/2025-10-24-automatic-resource-provisioning/).

## 2. Đặt mật khẩu quản trị trong Cloudflare

Sau khi deploy thành công:

1. Mở Worker `sunreminder` → **Settings → Variables and Secrets → Add**.
2. Type chọn **Secret**. Variable name nhập chính xác **SUN_ADMIN_PASSWORD**.
3. Value: tự đặt mật khẩu riêng dài **16–256 ký tự**, nên dùng mật khẩu ngẫu nhiên. Lưu mật khẩu trong nơi riêng của nhóm; không gửi vào chat, GitHub hoặc ảnh chụp.
4. Lưu/Deploy thay đổi theo nút Cloudflare hiển thị.
5. Mở tab **Bindings** và kiểm tra đã có **DB → D1 database**. Nếu thiếu hoặc build báo lỗi tạo D1, xem mục khắc phục bên dưới.

Mật khẩu này là mật khẩu quản trị online. File ADMIN-LOGIN.txt trên máy chỉ dùng cho server cục bộ, không tự đưa lên Cloudflare. Khi chưa có Secret, đồng hồ vẫn mở được nhưng gửi thống kê/quản trị chưa được kích hoạt.

Cloudflare có hai loại biến: biến cho tiến trình build và biến/Secret runtime. SUN_ADMIN_PASSWORD phải ở **Settings → Variables and Secrets** của Worker, không chỉ ở Build variables. Nguồn: [cấu hình Builds](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/).

## 3. Mở app và kiểm thử

Cloudflare cung cấp một URL HTTPS kết thúc bằng `workers.dev` trên trang Worker. Dùng đúng URL đó:

- Người dùng: URL gốc.
- Quản trị: thêm `/admin` vào cuối URL. Tài khoản **group4**, mật khẩu là Secret vừa đặt.
- Windows EXE: Cài đặt → Máy chủ nhận thống kê → nhập URL gốc, rồi đồng ý chia sẻ.

Trên một thiết bị thử, bật chia sẻ, chạy Nghỉ ngay đủ 20 giây khi app vẫn hiển thị. Trang quản trị phải tăng đúng một lượt nghỉ. Gửi lại không được cộng trùng. Check-in ngoài trời chỉ tăng khi tự bấm. Thử ngừng chia sẻ, sau đó thử thu hồi thống kê và xác nhận dữ liệu đã xóa khỏi báo cáo.

Ngày hoạt động được cộng theo từng thiết bị, không phải số người duy nhất. Dữ liệu localhost chưa được chuyển lên D1. Không đăng/upload thư mục server-data để chuyển dữ liệu. Người tham gia có thể nhập JSON vào app rồi đồng ý gửi thống kê tới địa chỉ mới.

## 4. Cài lên thiết bị

Android: mở URL HTTPS bằng Chrome, chọn Cài đặt ứng dụng/Thêm vào màn hình chính. iPhone: mở bằng Safari → Chia sẻ → Thêm vào Màn hình chính. Trên máy tính dùng tùy chọn cài app của trình duyệt khi có.

Bản PWA cần mở và màn hình hoạt động để chạy đồng hồ; không bảo đảm thông báo khi app đóng hoặc màn hình khóa. Windows EXE giữ tính năng chạy nền trong khay hệ thống.

## 5. Khắc phục lỗi

- **Missing entry point/config:** kiểm tra root là gốc kho, nhánh main mới nhất có wrangler.jsonc. Không chọn web làm root.
- **Assets directory does not exist:** Build command phải là npm run build.
- **Không tạo được D1:** trong Cloudflare mở D1 SQL database → Create Database → đặt tên sunreminder-db. Lấy Database ID (không phải mật khẩu), thêm `database_id` vào phần tử d1_databases trong wrangler.jsonc rồi commit/push. Nếu database cùng tên đã tồn tại, chọn đúng database hiện có; không xóa database để thử lại. Kiểm tra token build có quyền D1 cho tài khoản đang deploy.
- **App báo chưa cấu hình thống kê/503:** kiểm tra Secret SUN_ADMIN_PASSWORD đúng tên và đủ 16–256 ký tự, binding DB tồn tại; deploy lại thay đổi runtime. Có thể do quota D1 hoặc lỗi máy chủ, xem Worker logs/Usage nếu cả hai đã đúng.
- **Không đăng nhập được:** tên đăng nhập luôn là group4. Nhập mật khẩu đã đặt trên Cloudflare. Sau 10 lần sai trong 15 phút từ cùng IP, chờ rồi thử lại.
- **Đổi mật khẩu:** thay Secret và deploy. Các phiên quản trị đang có bị vô hiệu. Không cần xóa database.
- **Thống kê trống:** chọn đúng khoảng ngày, kiểm tra app đã bật chia sẻ và báo gửi thành công tại URL online mới.

## 6. Giới hạn và dữ liệu

Workers/D1 Free có hạn mức CPU, yêu cầu, số dòng đọc/ghi và dung lượng. Bản này chỉ cập nhật ngày thay đổi thay vì ghi lại toàn bộ lịch sử để giảm lượt ghi. Xem [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/) và [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/).

D1 lưu thống kê, mã thu hồi, phiên quản trị đã băm và bộ đếm giới hạn yêu cầu. Bộ đếm dùng mã băm có secret, không lưu IP nguyên dạng; các bộ đếm hết hạn được dọn theo đợt khi đăng nhập thành công. Nhóm cần quản lý backup, thời gian giữ và yêu cầu xóa dữ liệu. Mật khẩu là Cloudflare Secret, không nằm trong database/repository. Preview bị tắt để tránh thêm địa chỉ thử nghiệm trỏ vào dữ liệu thật.

## Phát triển

Từ gốc kho, dùng Node.js 24 LTS:

```sh
npm ci
npm test
npm run check:deploy
```

`npm run check:deploy` chỉ đóng gói thử, không đăng app. `npm test` chạy các kiểm thử cũ và Worker trên Miniflare + D1 cục bộ. Muốn chạy thử quản trị, tạo `.dev.vars` cục bộ chứa SUN_ADMIN_PASSWORD dùng riêng cho thử nghiệm rồi chạy `npm run dev`; file này đã được loại khỏi Git. Không dùng dữ liệu thật để kiểm thử xóa.

## Nâng cấp Web/PWA 3.3

Giữ nguyên binding DB và Secret SUN_ADMIN_PASSWORD. Bản này tự tạo thêm bảng thông tin thiết bị, tài khoản và phiên người dùng bằng CREATE TABLE IF NOT EXISTS; không đổi bảng lịch sử hoặc mã thiết bị cũ. Sau khi GitHub triển khai xong, đóng hết cửa sổ SunReminder rồi mở lại để cập nhật bản ngoại tuyến.

Tài khoản người dùng tách quyền khỏi admin. Mật khẩu người dùng dùng PBKDF2-SHA-256, 100.000 vòng (tương thích workerd hiện dùng), salt ngẫu nhiên từng tài khoản; không lưu mật khẩu gốc. Có giới hạn đăng nhập/đăng ký theo IP và tên đăng nhập. Khóa phiên chỉ giữ trong bộ nhớ trang, máy chủ lưu bản băm và thời hạn. Đổi mật khẩu admin không đổi mật khẩu người dùng. Chưa có khôi phục mật khẩu qua email hoặc đồng bộ lịch sử theo tài khoản.

Xem [hướng dẫn người dùng](HUONG-DAN.md#9-tài-khoản-tùy-chọn-tên-thiết-bị-và-gps-webpwa-33) để thử chế độ khách, đăng ký/đăng nhập và chia sẻ vị trí có đồng ý.

Bản 3.3 bổ sung bảng usage_daily và admin_transfers tự động, không cần chỉnh Secret hoặc binding. Cookie chuyển trang quản trị chỉ dùng một lần trong 60 giây; sau đó phiên quản trị chỉ còn trong bộ nhớ trang. Đồng ý chia sẻ thời gian dùng phiên bản group4-usage-v1, tách khỏi đồng ý thống kê cũ để không tự thu thêm từ người đang dùng.
