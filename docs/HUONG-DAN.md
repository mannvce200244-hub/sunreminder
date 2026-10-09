# SunReminder — Hướng dẫn Web/PWA 3.5 và Windows EXE v3

**Nắng sớm, mắt khỏe · Được thực hiện bởi Group 4**

Một ứng dụng nhỏ nhắc bạn nghỉ mắt trong lúc học và làm việc. Không cần tài khoản. Dữ liệu được lưu trên thiết bị.

## 1. Mở ứng dụng

### Windows 10/11 x64

Mở **App-v3/SunReminder.exe**, hoặc bấm **Launch-SunReminder.cmd**. Bản mới kèm runtime, không cần cài .NET. Nếu bản cũ đang chạy, chọn **Thoát ứng dụng** trong app hoặc menu biểu tượng mặt trời ở khay hệ thống trước khi mở bản mới. Bấm X có thể chỉ ẩn app, chưa thoát.

**Install.cmd** cài bản 3.0 cho tài khoản Windows hiện tại, tạo shortcut Desktop và Start menu. Cần thoát mọi phiên SunReminder trước khi cài. Việc cài không tự bật khởi động cùng Windows.

Lần chạy thông thường vẫn dùng `%LOCALAPPDATA%\SunReminder\data.json` như bản trước. Không cần chuyển dữ liệu để cập nhật trên cùng máy. File EXE cũ trong `App` được giữ nguyên để đối chiếu/quay lại; không chạy đồng thời hai phiên trên cùng hồ sơ.

### Bản web trên máy tính

Bản web nằm trong thư mục `web`, chạy trên Windows, macOS và các trình duyệt hiện đại. Để mở từ mã nguồn, cần Node.js 24 LTS:

```sh
cd SunReminder/web
node setup-admin.mjs
node server.mjs
```

Mở `http://localhost:4173`. Trên Windows có thể bấm **Start-Web.cmd**. Trên macOS có thể chạy `sh Start-Web.command` trong thư mục SunReminder. Giữ cửa sổ server mở trong lần tải đầu; sau khi báo sẵn sàng ngoại tuyến, app được lưu trong trình duyệt.

Không bấm đúp `index.html`: các module JavaScript và khả năng cài/offline cần một web server. `localhost` của điện thoại là chính điện thoại, không phải máy tính.

### Điện thoại và cài lên màn hình chính

Mở [SunReminder online](https://sunreminder.group4-ssg105.workers.dev/). Bản Cloudflare hỗ trợ thống kê và thông báo đẩy chạy nền; xem [hướng dẫn triển khai](CLOUDFLARE.md) nếu tự triển khai. Chưa có bản phát hành App Store/Google Play. Người tham gia không cần tài khoản; quản trị cần đăng nhập.

- **Android:** mở URL HTTPS trong Chrome → menu → Cài đặt ứng dụng / Thêm vào màn hình chính.
- **iPhone/iPad:** mở trong Safari → Chia sẻ → Thêm vào Màn hình chính.
- **macOS:** mở trong trình duyệt; dùng Thêm vào Dock hoặc Cài đặt ứng dụng nếu trình duyệt hỗ trợ.
- **Windows:** Chrome/Edge có thể cài bản web thành cửa sổ riêng. Bản EXE phù hợp hơn khi cần khay hệ thống.

Tên menu có thể khác theo phiên bản trình duyệt. Trong app, **Hướng dẫn → Cài trên thiết bị** cung cấp hướng dẫn tương ứng. Chờ thông báo **Đã sẵn sàng dùng ngoại tuyến** sau lần mở đầu trước khi dùng khi mất mạng.

## 2. Bắt đầu trong ba bước

1. Vào **Tập trung**, bấm **Bắt đầu tập trung**. Mặc định đồng hồ chạy 20 phút.
2. Khi có lời nhắc, bấm **Bắt đầu nghỉ**. Thả lỏng vai, chớp mắt tự nhiên và nhìn ra xa. Đồng hồ nghỉ mặc định 20 giây.
3. Khi đếm hết, app tự ghi **đã check-in nghỉ mắt** đúng một lần và bắt đầu chu kỳ tập trung tiếp theo. Check-in ngoài trời vẫn tự đánh dấu riêng.

| Nút | Tác dụng |
|---|---|
| Tạm dừng / Tiếp tục | Giữ và tiếp tục thời gian còn lại |
| Nghỉ ngay | Bắt đầu đếm ngược nghỉ ngay lập tức |
| Hoãn | Nhắc lại sau số phút đã cài đặt; lần nghỉ dở không được tính |
| Kết thúc phiên / Kết thúc | Dừng chu kỳ hiện tại |
| Đóng cửa sổ nhắc | Hoãn lời nhắc; không ghi hoàn thành |
| Hôm nay tôi đã ra ngoài | Đánh dấu check-in hôm nay; bấm lại để bỏ đánh dấu |
| Thử lời nhắc / Thử thông báo | Xem mẫu, không thay đổi đồng hồ hay lịch sử |

## 3. Cài đặt

- Khoảng tập trung: **5–120 phút**.
- Thời gian nghỉ: **20–120 giây**.
- Hoãn: **1–30 phút**.
- Cửa sổ nhắc và âm thanh tùy chọn; âm thanh mặc định tắt.
- Lời nhắc ngoài trời theo giờ đã chọn, mặc định tắt. App cần đang hoạt động đúng phút đó; không gửi bù lịch bỏ lỡ.
- Bấm **Lưu cài đặt** để áp dụng. Đổi thời gian sẽ đặt lại chu kỳ hiện tại.

Trên Windows còn có **ẩn xuống khay khi bấm X** và **khởi động cùng Windows**. Khởi động cùng Windows chỉ bật khi bạn chủ động chọn và lưu.

Trên web, nút **Bật thông báo thiết bị** yêu cầu quyền trình duyệt. Bạn có thể từ chối và dùng cửa sổ nhắc trong app. App không tự đổi chế độ Không làm phiền hoặc quyền hệ thống.

## 4. Lịch sử và dữ liệu

**Lịch sử** hiển thị biểu đồ 7 ngày và các lần nghỉ mới nhất. Bấm **Xem thêm lịch sử** để xem tiếp những lần cũ hơn, không giới hạn ở 500 bản ghi. Chỉ số biểu thị đồng hồ nghỉ hoàn thành, không xác nhận hành vi nhìn xa.

Bản Web/PWA 3.5 không có nút JSON/CSV trong giao diện người dùng. Lịch sử tự lưu trong trình duyệt theo địa chỉ app; đăng nhập chưa đồng bộ lịch sử giữa thiết bị. Xóa dữ liệu trình duyệt hoặc đổi địa chỉ sẽ tạo vùng dữ liệu khác. **Xóa lịch sử** cần xác nhận và vẫn giữ cài đặt. Nếu gặp lỗi lưu trữ, liên hệ Group 4 trước khi xóa dữ liệu.

Group 4 đăng nhập quản trị để dùng **Xuất CSV** hoặc **Công cụ dữ liệu → Tải báo cáo JSON** theo khoảng ngày đã chọn. Trong cùng khu vực có **Sao lưu JSON thiết bị / Nhập JSON thiết bị** để hỗ trợ lịch sử trên trình duyệt đang dùng. Nhập sẽ gộp lịch sử, tránh trùng, áp dụng cài đặt và đặt lại đồng hồ; app tải một bản sao trước khi nhập. Cần đóng các cửa sổ app người dùng trước. Công cụ này không truy cập lịch sử cục bộ trên máy người khác và không khôi phục cơ sở dữ liệu máy chủ. JSON báo cáo và JSON lịch sử là hai định dạng khác nhau.

Bản Windows EXE v3 vẫn giữ chức năng CSV, sao lưu và nhập như trước. Các file lịch sử Windows hợp lệ có thể nhập bằng công cụ JSON thiết bị trong trang quản trị Web.

## 5. Khi chuyển app, ngủ hoặc khóa màn hình

| Tình huống | Windows EXE | Web / ứng dụng cài từ web |
|---|---|---|
| Chuyển sang ứng dụng khác | Tiếp tục nhắc khi vẫn chạy trong khay | Giữ thời điểm hết giờ; có thể bật thông báo đẩy |
| Máy ngủ hoặc khóa | Ngừng phiên; khi mở lại bắt đầu chu kỳ đầy đủ | Máy chủ nhắc phiên đã đặt; mạng/hệ điều hành có thể làm trễ |
| Đã tạm dừng bằng tay | Giữ thời gian còn lại | Giữ thời gian còn lại khi ẩn/hiện trang |
| Thoát / tải lại | Chu kỳ không được khôi phục | Khôi phục đồng hồ đã lưu, xử lý một phiên hết giờ |
| Lần nghỉ hết giờ khi app đóng | Không ghi hoàn thành | Ghi một check-in khi mở lại theo giờ kết thúc đã lưu |

Web/PWA 3.4 dùng thời điểm hết giờ thực tế, không đặt lại khi chuyển tab. Để nhận thông báo khi app bị ẩn/đóng: mở **Cài đặt → Bật nhắc khi chạy nền**, cho phép thông báo, bắt đầu tập trung hoặc Nghỉ ngay và chờ trạng thái **Máy chủ đã nhận lịch**. iPhone/iPad cần iOS/iPadOS 16.4 trở lên và mở app từ Màn hình chính.

Máy chủ chỉ lưu đăng ký Web Push, thời điểm và loại nhắc của phiên đã đặt, tách khỏi dữ liệu thống kê, tài khoản và GPS. Không cần đăng nhập. Không tự bật chia sẻ thời gian sử dụng; thời gian dùng vẫn chỉ tính khi app hiển thị. Tạm dừng/kết thúc gửi yêu cầu hủy lịch; **Tắt nhắc từ máy chủ** hủy lịch và đăng ký trên thiết bị. Nếu mất mạng, hủy lịch sẽ chờ gửi lại, nên lời nhắc cũ có thể vẫn đến.

Cần mạng, quyền thông báo của trình duyệt và hệ điều hành. Máy tắt nguồn, trình duyệt bị buộc dừng, tiết kiệm pin hoặc Không làm phiền có thể chặn/làm trễ thông báo. Không đảm bảo như báo thức hệ điều hành. Khi app đóng, không tự tạo chuỗi nhắc vô hạn; mở lại để tiếp tục. Check-in của lần nghỉ đã hết giờ được lưu/đồng bộ khi mở lại app, không xác nhận hành vi nhìn xa. Nhắc ngoài trời buổi sáng vẫn chỉ chạy khi app hiển thị đúng giờ.

Chạy bằng **Start-Web.cmd / node server.mjs** giữ đồng hồ và nhắc tại máy nhưng không có máy chủ Web Push; dùng bản Cloudflare để bật nhắc nền. Sau cập nhật, đóng hết cửa sổ SunReminder rồi mở lại để nhận bản mới, không cần xóa lịch sử.

## 6. Group 4

| Thành viên | Vai trò |
|---|---|
| **Nguyễn Văn Mẫn** | **Leader · Trưởng nhóm** |
| Nguyễn Trần Đức Anh | Thành viên |
| Nguyễn Trần Phúc Đăng | Thành viên |
| Phan Võ Anh Hào | Thành viên |

Thông tin nhóm có trong **Về Group 4** trên Windows và **Group 4** trên web. SunReminder hỗ trợ xây dựng thói quen cho dự án Nắng sớm, mắt khỏe; không đo thị lực hoặc chẩn đoán bệnh.

## 7. Phát triển và phát hành

- Windows: .NET 10 SDK, `Build.cmd`. Kết quả mới ở `App-v3`.
- Web/Cloudflare: tại gốc kho, dùng `npm ci` rồi `npm test` để chạy toàn bộ kiểm thử. Chạy Node cục bộ bằng `node web/setup-admin.mjs` và `node web/server.mjs`; Web Push chỉ có trên bản Cloudflare.
- Triển khai cả web và API Node.js theo [QUAN-TRI.md](QUAN-TRI.md). Không dùng static hosting cho chức năng thu thống kê.
- Giữ đường dẫn thư mục ổn định để không thay vùng dữ liệu trình duyệt. Tăng phiên bản `CACHE` trong `sw.js` mỗi lần phát hành thay đổi web. Bản mới hoạt động sau khi đóng hết các cửa sổ bản cũ và mở lại.
- Chế độ QA riêng trên Windows: `SunReminder.exe --data-dir <đường-dẫn-thử>`. Không dùng thư mục dữ liệu thật để thử thao tác xóa.

Tham khảo yêu cầu cài PWA: [MDN — Making PWAs installable](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable).

## 8. Một nơi quản lý chia sẻ (Web/PWA 3.5)

1. Mở **Cài đặt → Chia sẻ với Group 4**.
2. Bật **Tôi đồng ý chia sẻ thống kê và thời gian sử dụng**. Chưa có dữ liệu gửi chỉ vì bật công tắc; cần nút lưu ở bước 4.
3. Có thể nhập **Tên thiết bị**. Nếu muốn gửi GPS, chọn **Kèm vị trí hiện tại**, cho phép trong trình duyệt rồi xem vị trí/sai số. Từ chối GPS vẫn chia sẻ được thống kê và thời gian. Không lấy vị trí khi mở app hoặc theo dõi liên tục.
4. Bấm **Bật chia sẻ** hoặc **Lưu & gửi lựa chọn**. Thống kê, thời gian, tên nhập vào/tên tài khoản đang đăng nhập và vị trí đã chọn được lưu trong cùng một thao tác. Đợi trạng thái gửi thành công.
5. Tắt công tắc để ngừng gửi mới ngay. Muốn bỏ GPS trên dashboard: bỏ chọn vị trí rồi lưu khi đang bật chia sẻ. Muốn xóa tất cả dữ liệu đã gửi: mở **Quản lý dữ liệu đã gửi → Ngừng & xóa dữ liệu đã gửi**. Lịch sử tại máy và tài khoản vẫn giữ.

Mặc định tắt. Người đã dùng phiên bản cũ giữ nguyên lựa chọn hiện có; không tự bật thu thời gian/GPS khi nâng cấp. Muốn áp dụng lựa chọn chung mới phải bấm lưu. Các thay đổi của phiên đang chia sẻ được lưu trên máy và thử gửi lại khi có mạng. Đăng nhập hoặc đổi tên tài khoản không tự gửi tên mới; lưu biểu mẫu chia sẻ để cập nhật.

Group 4 nhận tổng hợp lượt nghỉ, giây nghỉ, ngày ngoài trời từ lịch sử, số giây app hiển thị từ lúc đồng ý, cùng thông tin tùy chọn. Không gửi nội dung màn hình hay thời điểm từng lần nghỉ. Thời gian chạy nền, máy ngủ và khoảng đồng hồ hệ thống nhảy không được cộng vào thời gian dùng. Có thể thiếu vài giây khi đóng đột ngột. Bật chia sẻ không tự tạo check-in và không đổi nghĩa của ngày hoạt động.

Mỗi thiết bị/trình duyệt có mã riêng. Xóa dữ liệu trang làm mất lịch sử và khóa để quản lý dữ liệu đã gửi; hãy ngừng và xóa chia sẻ trước nếu cần. Windows EXE v3 tiếp tục dùng biểu mẫu chia sẻ cũ.

## 9. Đăng nhập tùy chọn

Bấm **Đăng nhập** ở đầu trang để đăng nhập hoặc tạo tài khoản với tên hiển thị. Không cần email. Mật khẩu người dùng mới dài 12–128 ký tự; tên đăng nhập gồm 3–32 chữ/số/gạch dưới. Chưa có khôi phục mật khẩu qua email. Không đăng nhập vẫn dùng đầy đủ đồng hồ, lịch sử, check-in và chia sẻ tự nguyện.

Tài khoản **group4** được xác thực rồi chuyển thẳng tới dashboard; tài khoản người dùng ở lại app. Người dùng đổi tên tại **Xin chào, …**; tên trên dashboard cập nhật sau khi lưu lại biểu mẫu chia sẻ. Đăng xuất không xóa lịch sử hoặc tự tắt chia sẻ đang bật.

Mở lại/tải lại trang quản trị cần đăng nhập. Phiên quản trị tự khóa sau 10 phút không thao tác, tối đa 30 phút. Tài khoản người dùng được giữ trong bộ nhớ trang, tối đa một giờ; không lưu mật khẩu trong app. Tính năng tài khoản chưa hợp nhất lịch sử giữa các máy.
